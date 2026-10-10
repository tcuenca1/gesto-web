import { Camara, ErrorCamara } from '../../nucleo/puertos/camara';

/**
 * Adaptador del puerto Camara con la API del navegador (getUserMedia).
 *
 * La imagen solo se muestra en el <video> de la página y la lee el modelo
 * en el mismo navegador: nunca se envía ni se guarda (RNF-01).
 */
export class CamaraNavegador extends Camara {
  private flujo: MediaStream | null = null;

  get encendida(): boolean {
    return this.flujo !== null;
  }

  async encender(video: HTMLVideoElement): Promise<void> {
    if (!window.isSecureContext) {
      throw new ErrorCamara('SITIO_INSEGURO', 'La cámara solo funciona en sitios seguros: abre la página con https o en localhost.');
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new ErrorCamara('NO_SOPORTADA', 'Este navegador no permite usar la cámara. Usa Chrome, Edge o Firefox actualizados.');
    }

    try {
      // Resolución baja a propósito: el modelo no necesita más y las laptops lentas lo agradecen.
      this.flujo = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 }, facingMode: 'user' },
        audio: false,
      });
    } catch (error) {
      throw traducir(error);
    }

    video.muted = true;
    video.playsInline = true;
    video.srcObject = this.flujo;
    await new Promise<void>((resolver) => {
      if (video.readyState >= 2) return resolver();
      video.addEventListener('loadeddata', () => resolver(), { once: true });
    });
    await video.play();
  }

  apagar(): void {
    this.flujo?.getTracks().forEach((pista) => pista.stop());
    this.flujo = null;
  }
}

function traducir(error: unknown): ErrorCamara {
  const nombre = (error as { name?: string })?.name;
  switch (nombre) {
    case 'NotAllowedError':
    case 'SecurityError':
      return new ErrorCamara(
        'PERMISO_NEGADO',
        'No diste permiso para usar la cámara. Haz clic en el ícono de la cámara o del candado en la barra de direcciones, elige "Permitir" y vuelve a encenderla.',
      );
    case 'NotFoundError':
    case 'OverconstrainedError':
      return new ErrorCamara('SIN_CAMARA', 'No encontramos ninguna cámara. Conecta una cámara web y vuelve a intentarlo.');
    case 'NotReadableError':
    case 'AbortError':
      return new ErrorCamara('OCUPADA', 'La cámara está ocupada. Cierra Zoom, Meet u otras apps que la estén usando y vuelve a intentarlo.');
    default:
      return new ErrorCamara('DESCONOCIDO', 'No se pudo encender la cámara. Recarga la página y vuelve a intentarlo.');
  }
}
