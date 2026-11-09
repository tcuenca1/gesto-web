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
    // Colores del sistema de diseño: fondo del visor y texto tenue en mono.
    const estilos = getComputedStyle(document.documentElement);
    const fondo = estilos.getPropertyValue('--visor').trim();
    const texto = estilos.getPropertyValue('--tinta-tenue').trim();
    const dibujar = () => {
      ctx.fillStyle = fondo;
      ctx.fillRect(0, 0, 640, 480);
      ctx.fillStyle = texto;
      ctx.font = '500 18px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      // El video se ve espejado, así que el texto se dibuja al revés para leerse bien.
      ctx.save();
      ctx.scale(-1, 1);
      ctx.fillText('CÁMARA SIMULADA · TECLAS 1 A 7', -320, 450);
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
