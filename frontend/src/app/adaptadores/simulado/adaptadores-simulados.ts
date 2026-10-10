import { CODIGOS_GESTO, Punto, ResultadoReconocimiento } from '../../nucleo/dominio/gesto';
import { Camara } from '../../nucleo/puertos/camara';
import { ReconocedorGestos } from '../../nucleo/puertos/reconocedor-gestos';

/**
 * Adaptadores simulados: cumplen los mismos puertos que la cámara real y
 * MediaPipe, pero sin hardware. Se activan abriendo la app con ?simulado=1.
 *
 * Sirven para:
 *  - Desarrollar las pantallas sin cámara.
 *  - El plan B de la demo si la cámara falla.
 *  - Demostrar la arquitectura hexagonal en el frontend: el núcleo
 *    (reglas de aceptación, motor, panel) funciona igual sin cambiar nada.
 *
 * El gesto "visto" se elige con los botones de la pantalla o las teclas 1 a 7.
 */
export class ReconocedorSimulado extends ReconocedorGestos {
  /** Gesto que la persona "está haciendo" (null = no hay mano). */
  gestoActual: string | null = null;

  cargar(): Promise<void> {
    return new Promise((r) => setTimeout(r, 300));
  }

  reconocer(_fuente: HTMLVideoElement, marcaTiempoMs: number): ResultadoReconocimiento | null {
    if (!this.gestoActual) return null;
    const temblor = Math.sin(marcaTiempoMs / 180) * 0.03;
    return {
      codigo: this.gestoActual,
      confianza: Math.min(0.99, 0.9 + temblor),
      mano: 'Derecha',
      puntos: manoSintetica(this.gestoActual, marcaTiempoMs),
    };
  }

  liberar(): void {
    this.gestoActual = null;
  }
}

/** Cámara falsa: un video generado con un <canvas>. */
export class CamaraSimulada extends Camara {
  private flujo: MediaStream | null = null;
  private animacion = 0;

  get encendida(): boolean {
    return this.flujo !== null;
  }

  async encender(video: HTMLVideoElement): Promise<void> {
    const lienzo = document.createElement('canvas');
    lienzo.width = 640;
    lienzo.height = 480;
    const ctx = lienzo.getContext('2d')!;
    const dibujar = (t: number) => {
      const g = ctx.createLinearGradient(0, 0, 640, 480);
      g.addColorStop(0, '#1d2d52');
      g.addColorStop(1, `hsl(${220 + Math.sin(t / 2000) * 20}, 45%, 22%)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 640, 480);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = '600 22px sans-serif';
      ctx.textAlign = 'center';
      // El video se ve espejado, así que el texto se dibuja al revés para leerse bien.
      ctx.save();
      ctx.scale(-1, 1);
      ctx.fillText('Cámara simulada · elige un gesto abajo', -320, 450);
      ctx.restore();
      this.animacion = requestAnimationFrame(dibujar);
    };
    this.animacion = requestAnimationFrame(dibujar);
    this.flujo = lienzo.captureStream(30);
    video.muted = true;
    video.srcObject = this.flujo;
    await video.play();
  }

  apagar(): void {
    cancelAnimationFrame(this.animacion);
    this.flujo?.getTracks().forEach((p) => p.stop());
    this.flujo = null;
  }
}

/**
 * Dibuja una mano aproximada para cada gesto, solo para que el modo simulado
 * muestre algo parecido a lo que dibuja MediaPipe.
 */
function manoSintetica(codigo: string, t: number): Punto[] {
  // Dedos extendidos (pulgar, índice, medio, anular, meñique) por gesto.
  const extendidos: Record<string, boolean[]> = {
    Open_Palm: [true, true, true, true, true],
    Closed_Fist: [false, false, false, false, false],
    Pointing_Up: [false, true, false, false, false],
    Victory: [false, true, true, false, false],
    Thumb_Up: [true, false, false, false, false],
    Thumb_Down: [true, false, false, false, false],
    ILoveYou: [true, true, false, false, true],
  };
  const dedos = extendidos[codigo] ?? extendidos['Open_Palm'];
  const invertido = codigo === 'Thumb_Down' ? -1 : 1;
  const cx = 0.5 + Math.sin(t / 900) * 0.015;
  const cy = 0.62;
  const puntos: Punto[] = [{ x: cx, y: cy + 0.12 * invertido, z: 0 }];
  const bases = [-0.09, -0.045, 0, 0.045, 0.085];
  bases.forEach((dx, i) => {
    const esPulgar = i === 0;
    const largo = dedos[i] ? (esPulgar ? 0.06 : 0.075) : 0.025;
    const angulo = esPulgar ? -0.9 : (i - 2) * 0.12;
    let x = cx + dx;
    let y = cy + (esPulgar ? 0.05 : -0.02) * invertido;
    for (let j = 0; j < 4; j++) {
      puntos.push({ x, y, z: 0 });
      if (esPulgar && codigo.startsWith('Thumb')) {
        y -= largo * invertido; // pulgar vertical
      } else {
        x += Math.sin(angulo) * largo;
        y -= Math.cos(angulo) * largo * invertido;
      }
    }
  });
  return puntos.slice(0, 21);
}

export const GESTOS_SIMULABLES = CODIGOS_GESTO;
