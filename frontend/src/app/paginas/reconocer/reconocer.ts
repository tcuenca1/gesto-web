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
import { ReconocedorSimulado } from '../../adaptadores/simulado/adaptadores-simulados';
import { MODO_SIMULADO } from '../../compartido/modo-simulado';
import { Avisos } from '../../compartido/servicios/avisos';
import { porcentaje } from '../../compartido/utilidades';
import { CONEXIONES_MANO, GUIA_GESTOS, infoGesto, ResultadoReconocimiento } from '../../nucleo/dominio/gesto';
import { ReconocedorGestos } from '../../nucleo/puertos/reconocedor-gestos';
import { MotorReconocimiento } from '../../nucleo/servicios/motor-reconocimiento';
import { PanelDemostracion } from './panel-demostracion';

/**
 * Pantalla Reconocer (CU-03): cámara, lectura del gesto y panel de demostración.
 * El motor se provee aquí, así se apaga solo al salir de la página.
 */
@Component({
  selector: 'app-reconocer',
  imports: [PanelDemostracion, RouterLink],
  providers: [MotorReconocimiento],
  templateUrl: './reconocer.html',
  styleUrl: './reconocer.scss',
})
export class Reconocer implements OnDestroy {
  protected readonly motor = inject(MotorReconocimiento);
  protected readonly simulado = inject(MODO_SIMULADO);
  private readonly reconocedor = inject(ReconocedorGestos);
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

  /** Texto y datos que se muestran bajo la cámara, según el estado de las reglas. */
  protected readonly lectura = computed(() => {
    const l = this.motor.lectura();
    switch (l.tipo) {
      case 'sin-mano':
        return { titulo: 'Muestra tu mano a la cámara', icono: '', confianza: 0, progreso: 0, clase: 'espera' };
      case 'buscando':
        return {
          titulo: 'Buscando gesto',
          detalle: l.codigo ? `Parece ${infoGesto(l.codigo)?.nombre.toLowerCase() ?? l.codigo}, pero con poca seguridad` : 'Veo tu mano, pero no un gesto conocido',
          icono: l.codigo ? (infoGesto(l.codigo)?.icono ?? '') : '',
          confianza: l.confianza,
          progreso: 0,
          clase: 'espera',
        };
      case 'estabilizando':
        return { titulo: infoGesto(l.codigo)?.nombre ?? l.codigo, detalle: 'Mantén el gesto…', icono: infoGesto(l.codigo)?.icono ?? '', confianza: l.confianza, progreso: l.progreso, clase: 'cargando' };
      case 'en-pausa':
        return { titulo: infoGesto(l.codigo)?.nombre ?? l.codigo, detalle: 'Listo. Mantenlo para repetir', icono: infoGesto(l.codigo)?.icono ?? '', confianza: l.confianza, progreso: 1, clase: 'aceptado' };
      case 'aceptado':
        return { titulo: infoGesto(l.codigo)?.nombre ?? l.codigo, detalle: 'Gesto aceptado', icono: infoGesto(l.codigo)?.icono ?? '', confianza: l.confianza, progreso: 1, clase: 'aceptado' };
    }
  });

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
    if (this.reconocedor instanceof ReconocedorSimulado) this.reconocedor.gestoActual = codigo;
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
    ctx.strokeStyle = 'rgba(242, 193, 78, 0.9)';
    for (const [a, b] of CONEXIONES_MANO) {
      if (!p[a] || !p[b]) continue;
      ctx.beginPath();
      ctx.moveTo(p[a].x, p[a].y);
      ctx.lineTo(p[b].x, p[b].y);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    for (const punto of p) {
      ctx.beginPath();
      ctx.arc(punto.x, punto.y, Math.max(3, lienzo.width / 200), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
