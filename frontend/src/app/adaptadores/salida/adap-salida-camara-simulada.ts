import { PuertoSalidaCamara } from '../../nucleo/puerto/salida/puerto-salida-camara';

/** Cámara falsa: un video generado con un <canvas>. */
export class AdapSalida_CamaraSimulada extends PuertoSalidaCamara {
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
