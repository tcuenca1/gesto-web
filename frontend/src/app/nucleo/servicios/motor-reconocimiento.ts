import { inject, Injectable, NgZone, OnDestroy, signal } from '@angular/core';
import { ResultadoReconocimiento } from '../dominio/gesto';
import { Asignacion, ErrorApi, NuevaDeteccion } from '../dominio/modelos';
import { ApiGestoWeb, ApiReconocimiento } from '../puertos/api-gestoweb';
import { Camara, ErrorCamara } from '../puertos/camara';
import { ReconocedorGestos } from '../puertos/reconocedor-gestos';
import { ColaDetecciones } from './cola-detecciones';
import { EjecutorAcciones, ResultadoEjecucion } from './ejecutor-acciones';
import { EstadoReconocimiento, ReglasAceptacion } from './reglas-aceptacion';

export type EstadoMotor = 'apagado' | 'cargando' | 'activo' | 'error';

export interface UltimaAccion {
  codigoGesto: string;
  nombreGesto: string;
  nombreAccion: string;
  confianza: number;
  resultado: ResultadoEjecucion;
  hora: Date;
}

/**
 * Motor de reconocimiento: el caso de uso CU-03 del lado del navegador.
 *
 * Coordina los puertos (Camara, ReconocedorGestos, ApiReconocimiento) con
 * las reglas del núcleo. No sabe que la cámara es getUserMedia ni que el
 * modelo es MediaPipe: solo conoce los contratos. Por eso en modo simulado
 * funciona igual con adaptadores falsos.
 *
 * Se provee en el componente de la página Reconocer: vive mientras la
 * página está abierta y se apaga solo al salir.
 */
@Injectable()
export class MotorReconocimiento implements OnDestroy {
  private readonly camara = inject(Camara);
  private readonly reconocedor = inject(ReconocedorGestos);
  private readonly api: ApiReconocimiento = inject(ApiGestoWeb); // solo la parte que necesita (ISP)
  private readonly zona = inject(NgZone);

  /** Las páginas registran aquí lo que sabe hacer cada acción. */
  readonly ejecutor = new EjecutorAcciones();

  readonly estado = signal<EstadoMotor>('apagado');
  readonly mensajeError = signal<string | null>(null);
  readonly lectura = signal<EstadoReconocimiento>({ tipo: 'sin-mano' }, { equal: lecturasParecidas });
  readonly fps = signal(0);
  readonly ultimaAccion = signal<UltimaAccion | null>(null);
  readonly asignaciones = signal<Asignacion[]>([]);
  readonly pendientes = signal(0);
  readonly guardadas = signal(0);
  readonly sinConexion = signal(false);

  /** Se llama con cada resultado del modelo (para dibujar los puntos de la mano). */
  alAnalizar: ((resultado: ResultadoReconocimiento | null) => void) | null = null;

  private reglas = new ReglasAceptacion(new Map());
  private cola: ColaDetecciones | null = null;
  private idSesion: Promise<number> | null = null;
  private cuadro = 0;
  private ultimoTiempoVideo = -1;
  private contadorFps = { cuadros: 0, desde: 0 };

  /** Carga qué acción hace cada gesto (para mostrarlo antes de encender la cámara). */
  async cargarAsignaciones(): Promise<void> {
    try {
      this.asignaciones.set(await this.api.asignaciones());
    } catch {
      /* se vuelve a intentar al encender la cámara */
    }
  }

  async encender(video: HTMLVideoElement): Promise<void> {
    if (this.estado() === 'cargando' || this.estado() === 'activo') return;
    this.estado.set('cargando');
    this.mensajeError.set(null);
    try {
      // Pasos 2 y 3 de CU-03: permiso de cámara, modelo y configuración del usuario.
      const [asignaciones] = await Promise.all([this.api.asignaciones(), this.reconocedor.cargar()]);
      this.asignaciones.set(asignaciones);
      this.reglas = new ReglasAceptacion(new Map(asignaciones.map((a) => [a.gesto.codigo, a.gesto.umbralConfianza])));
      await this.camara.encender(video);

      this.cola = new ColaDetecciones(
        (d) => this.enviar(d),
        (n) => this.pendientes.set(n),
      );
      this.guardadas.set(0);
      void this.sesion().catch(() => this.sinConexion.set(true)); // se reintenta al enviar
      this.estado.set('activo');
      this.zona.runOutsideAngular(() => this.iniciarBucle(video));
    } catch (error) {
      this.camara.apagar();
      this.estado.set('error');
      this.mensajeError.set(mensajeDe(error));
    }
  }

  /** Paso 9 de CU-03: apagar la cámara y cerrar la sesión de reconocimiento. */
  async apagar(): Promise<void> {
    cancelAnimationFrame(this.cuadro);
    this.camara.apagar();
    this.alAnalizar?.(null);
    this.lectura.set({ tipo: 'sin-mano' });
    this.fps.set(0);
    if (this.estado() !== 'error') this.estado.set('apagado');

    const cola = this.cola;
    const sesion = this.idSesion;
    this.cola = null;
    this.idSesion = null;
    if (!cola) return;
    // Último intento de guardar lo pendiente (máximo 3 segundos).
    await Promise.race([cola.vaciar(), new Promise((r) => setTimeout(r, 3000))]);
    cola.detener();
    if (sesion) {
      await sesion.then((id) => this.api.cerrarSesion(id)).catch(() => undefined);
    }
  }

  ngOnDestroy(): void {
    void this.apagar();
  }

  /** Para la demo y las pruebas: aceptar un gesto como si viniera de la cámara. */
  procesarResultado(resultado: ResultadoReconocimiento | null, ahoraMs: number): void {
    this.alAnalizar?.(resultado);
    const lectura = this.reglas.evaluar(resultado, ahoraMs);
    this.lectura.set(lectura);
    if (lectura.tipo === 'aceptado') {
      this.zona.run(() => this.aceptar(lectura.codigo, lectura.confianza, lectura.mano));
    }
  }

  private iniciarBucle(video: HTMLVideoElement): void {
    this.contadorFps = { cuadros: 0, desde: performance.now() };
    this.ultimoTiempoVideo = -1;
    const paso = () => {
      if (this.estado() !== 'activo') return;
      this.cuadro = requestAnimationFrame(paso);
      // Solo se analiza cuando el video trae una imagen nueva.
      if (video.readyState < 2 || video.currentTime === this.ultimoTiempoVideo) return;
      this.ultimoTiempoVideo = video.currentTime;

      const ahora = performance.now();
      this.procesarResultado(this.reconocedor.reconocer(video, ahora), ahora);
      this.medirFps(ahora);
    };
    this.cuadro = requestAnimationFrame(paso);
  }

  /** Pasos 7 y 8 de CU-03: ejecutar la acción y guardar la detección. */
  private aceptar(codigo: string, confianza: number, mano: string): void {
    const asignacion = this.asignaciones().find((a) => a.gesto.codigo === codigo);
    const resultado = this.ejecutor.ejecutar(asignacion?.accion?.codigo);
    this.ultimaAccion.set({
      codigoGesto: codigo,
      nombreGesto: asignacion?.gesto.nombre ?? codigo,
      nombreAccion: asignacion?.accion?.nombre ?? 'Ninguna',
      confianza,
      resultado,
      hora: new Date(),
    });
    this.cola?.agregar({
      codigoGesto: codigo,
      confianza: Math.round(confianza * 1000) / 1000,
      mano,
      fechaHora: new Date().toISOString(),
    });
  }

  private sesion(): Promise<number> {
    this.idSesion ??= this.api
      .abrirSesion(navegadorActual())
      .then((s) => s.id)
      .catch((error) => {
        this.idSesion = null;
        throw error;
      });
    return this.idSesion;
  }

  private async enviar(deteccion: NuevaDeteccion): Promise<void> {
    try {
      await this.api.registrarDeteccion(await this.sesion(), deteccion);
      this.guardadas.update((n) => n + 1);
      this.sinConexion.set(false);
    } catch (error) {
      if (error instanceof ErrorApi && error.codigo === 'SESION_CERRADA') {
        // La sesión se cerró en el servidor (por ejemplo, otra pestaña abrió una nueva):
        // se abre otra y la detección se reintenta.
        this.idSesion = null;
        throw new ErrorApi(503, 'Sesión reabierta');
      }
      if (!(error instanceof ErrorApi) || error.reintentable) this.sinConexion.set(true);
      throw error;
    }
  }

  private medirFps(ahora: number): void {
    this.contadorFps.cuadros++;
    const transcurrido = ahora - this.contadorFps.desde;
    if (transcurrido >= 1000) {
      this.fps.set(Math.round((this.contadorFps.cuadros * 1000) / transcurrido));
      this.contadorFps = { cuadros: 0, desde: ahora };
    }
  }
}

/** Evita redibujar la pantalla por cambios mínimos de confianza o progreso. */
function lecturasParecidas(a: EstadoReconocimiento, b: EstadoReconocimiento): boolean {
  if (a.tipo !== b.tipo) return false;
  if (a.tipo === 'sin-mano' || b.tipo === 'sin-mano') return true;
  if (a.codigo !== b.codigo) return false;
  if (Math.abs(a.confianza - b.confianza) > 0.02) return false;
  if (a.tipo === 'estabilizando' && b.tipo === 'estabilizando') return Math.abs(a.progreso - b.progreso) < 0.08;
  return a.tipo !== 'aceptado';
}

function navegadorActual(): string {
  const ua = navigator.userAgent;
  const nombre = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Otro';
  const version = /(?:Edg|Firefox|Chrome|Version)\/(\d+)/.exec(ua)?.[1] ?? '';
  return `${nombre} ${version}`.trim();
}

function mensajeDe(error: unknown): string {
  if (error instanceof ErrorCamara || error instanceof ErrorApi) return error.message;
  return 'No se pudo cargar el modelo de gestos. Revisa tu conexión a internet y vuelve a intentarlo.';
}
