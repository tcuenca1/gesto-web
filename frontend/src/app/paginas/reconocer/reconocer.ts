import { IconoGesto } from '../../compartido/componentes/icono-gesto';
import {
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { MODO_SIMULADO } from '../../compartido/modo-simulado';
import { Avisos } from '../../compartido/servicios/avisos';
import { porcentaje } from '../../compartido/utilidades';
import { CONEXIONES_MANO, GUIA_GESTOS, infoGesto, ResultadoReconocimiento } from '../../nucleo/dominio/gesto';
import { PuertoSalidaSimuladorGestos } from '../../nucleo/puerto/salida/puerto-salida-simulador-gestos';
import { REGLAS_SRS } from '../../nucleo/caso_uso/caso-uso-reglas-aceptacion';
import { CasoUso_MotorReconocimiento } from '../../nucleo/caso_uso/caso-uso-motor-reconocimiento';
import { PanelDemostracion } from './panel-demostracion';

/**
 * Pantalla Reconocer (CU-03): cámara, lectura del gesto y panel de demostración.
 * El motor se provee aquí, así se apaga solo al salir de la página.
 */
@Component({
  selector: 'app-reconocer',
  imports: [IconoGesto, PanelDemostracion, RouterLink],
  providers: [CasoUso_MotorReconocimiento],
  templateUrl: './reconocer.html',
  styleUrl: './reconocer.scss',
})
export class Reconocer implements OnDestroy {
  protected readonly motor = inject(CasoUso_MotorReconocimiento);
  protected readonly simulado = inject(MODO_SIMULADO);
  private readonly simulador = inject(PuertoSalidaSimuladorGestos);
  private readonly avisos = inject(Avisos);

  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private readonly lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');

  protected readonly mostrarFps = environment.mostrarFps;
  protected readonly porcentaje = porcentaje;
  protected readonly redondear = Math.round;

  /** Los 7 gestos con la acción que tiene asignada este usuario. */
  protected readonly leyenda = computed(() => {
    const asignaciones = this.motor.asignaciones();
    return GUIA_GESTOS.map((g) => {
      const a = asignaciones.find((x) => x.gesto.codigo === g.codigo);
      return { ...g, nombre: a?.gesto.nombre ?? g.nombre, accion: a ? (a.accion?.nombre ?? 'Ninguna') : '…', activo: !asignaciones.length || !!a };
    });
  });

  /** Texto y datos del panel de lectura, según el estado de las reglas de aceptación. */
  protected readonly lectura = computed(() => {
    const l = this.motor.lectura();
    const nombre = (c: string) => infoGesto(c)?.nombre ?? c;
    switch (l.tipo) {
      case 'sin-mano':
        return { titulo: 'Sin mano', detalle: 'Muestra tu mano a la cámara.', estado: 'ESPERANDO', codigo: null, confianza: 0, clase: 'espera' };
      case 'buscando':
        return {
          titulo: l.codigo ? nombre(l.codigo) : 'Sin gesto',
          detalle: l.codigo ? 'Confianza bajo el umbral: acerca la mano o mejora la luz.' : 'Se ve una mano, pero no un gesto conocido.',
          estado: 'DESCARTADO',
          codigo: l.codigo ?? null,
          confianza: l.confianza,
          clase: 'espera',
        };
      case 'estabilizando': {
        const ms = Math.round(l.progreso * REGLAS_SRS.estabilidadMs);
        return { titulo: nombre(l.codigo), detalle: 'Mantén el gesto.', estado: `ESTABILIZANDO ${ms}/${REGLAS_SRS.estabilidadMs} ms`, codigo: l.codigo, confianza: l.confianza, clase: 'cargando' };
      }
      case 'en-pausa':
        return { titulo: nombre(l.codigo), detalle: 'Pausa de 1 s antes de repetir.', estado: 'EN PAUSA', codigo: l.codigo, confianza: l.confianza, clase: 'aceptado' };
      case 'aceptado':
        return { titulo: nombre(l.codigo), detalle: '', estado: 'ACEPTADO', codigo: l.codigo, confianza: l.confianza, clase: 'aceptado' };
    }
  });

  /** Barra de confianza en 10 tramos, con el umbral del gesto marcado. */
  protected readonly tramos = Array.from({ length: 10 }, (_, i) => i);
  protected readonly tramosLlenos = computed(() => Math.round(this.lectura().confianza * 10));
  protected readonly umbral = computed(() => {
    const codigo = this.lectura().codigo;
    const gesto = this.motor.asignaciones().find((a) => a.gesto.codigo === codigo)?.gesto;
    return gesto?.umbralConfianza ?? 0.7;
  });
  protected readonly tramoUmbral = computed(() => Math.min(9, Math.ceil(this.umbral() * 10) - 1));

  constructor() {
    void this.motor.cargarAsignaciones();
    this.motor.alAnalizar = (r) => this.dibujar(r);
    // Si una acción no existe en el panel (por ejemplo, una creada por el administrador), se avisa.
    effect(() => {
      const u = this.motor.ultimaAccion();
      if (u?.resultado === 'sin-manejador') this.avisos.info(`"${u.nombreAccion}" no tiene efecto en este panel de demostración.`);
    });
  }

  ngOnDestroy(): void {
    this.motor.alAnalizar = null;
  }

  protected encender(): void {
    void this.motor.encender(this.video().nativeElement);
  }

  protected apagar(): void {
    void this.motor.apagar();
  }

  // ---------- Modo simulado: se "hace" un gesto manteniendo presionado un botón o una tecla 1-7 ----------
  protected simular(codigo: string | null): void {
    this.simulador.simular(codigo);
  }

  @HostListener('window:keydown', ['$event'])
  protected teclaAbajo(e: KeyboardEvent): void {
    const n = Number(e.key);
    if (!this.simulado || e.repeat || !(n >= 1 && n <= 7) || (e.target as HTMLElement)?.tagName === 'INPUT') return;
    this.simular(GUIA_GESTOS[n - 1].codigo);
  }

  @HostListener('window:keyup', ['$event'])
  protected teclaArriba(e: KeyboardEvent): void {
    if (this.simulado && /^[1-7]$/.test(e.key)) this.simular(null);
  }

  // ---------- Dibujo de los puntos de la mano (RF-07) ----------
  private dibujar(resultado: ResultadoReconocimiento | null): void {
    const lienzo = this.lienzo()?.nativeElement;
    const video = this.video()?.nativeElement;
    if (!lienzo || !video) return;
    if (lienzo.width !== video.videoWidth && video.videoWidth) {
      lienzo.width = video.videoWidth;
      lienzo.height = video.videoHeight;
    }
    const ctx = lienzo.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, lienzo.width, lienzo.height);
    if (!resultado?.puntos.length) return;

    const p = resultado.puntos.map((pt) => ({ x: pt.x * lienzo.width, y: pt.y * lienzo.height }));
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(3, lienzo.width / 160);
    // Mismos colores que los íconos: huesos en papel y puntas de los dedos en rojo señal.
    const estilos = getComputedStyle(document.documentElement);
    const papel = estilos.getPropertyValue('--papel').trim();
    const senal = estilos.getPropertyValue('--senal').trim();
    ctx.strokeStyle = papel;
    for (const [a, b] of CONEXIONES_MANO) {
      if (!p[a] || !p[b]) continue;
      ctx.beginPath();
      ctx.moveTo(p[a].x, p[a].y);
      ctx.lineTo(p[b].x, p[b].y);
      ctx.stroke();
    }
    const puntas = new Set([4, 8, 12, 16, 20]);
    p.forEach((punto, i) => {
      ctx.fillStyle = puntas.has(i) ? senal : papel;
      ctx.beginPath();
      ctx.arc(punto.x, punto.y, Math.max(3, lienzo.width / (puntas.has(i) ? 130 : 200)), 0, Math.PI * 2);
      ctx.fill();
    });
  }
}
