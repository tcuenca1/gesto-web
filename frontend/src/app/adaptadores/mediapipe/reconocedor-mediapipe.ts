import type { GestureRecognizer, GestureRecognizerOptions } from '@mediapipe/tasks-vision';
import { environment } from '../../../environments/environment';
import { CODIGO_NINGUNO, Mano, ResultadoReconocimiento } from '../../nucleo/dominio/gesto';
import { ReconocedorGestos } from '../../nucleo/puertos/reconocedor-gestos';

/**
 * Adaptador del puerto ReconocedorGestos con MediaPipe Gesture Recognizer.
 *
 * Es el ÚNICO archivo del frontend que importa @mediapipe/tasks-vision.
 * Si mañana se cambia de modelo, solo se reemplaza este archivo (RNF-12).
 *
 * La librería se carga con import() dinámico: así no pesa en la primera
 * carga de la aplicación, solo cuando alguien enciende la cámara.
 */
export class ReconocedorMediaPipe extends ReconocedorGestos {
  private modelo: GestureRecognizer | null = null;
  private carga: Promise<void> | null = null;

  cargar(): Promise<void> {
    this.carga ??= this.crear().catch((error) => {
      this.carga = null;
      throw error;
    });
    return this.carga;
  }

  reconocer(fuente: HTMLVideoElement, marcaTiempoMs: number): ResultadoReconocimiento | null {
    if (!this.modelo) return null;
    const r = this.modelo.recognizeForVideo(fuente, marcaTiempoMs);
    if (!r.landmarks.length) return null;

    const gesto = r.gestures[0]?.[0];
    const lado = r.handedness[0]?.[0]?.categoryName;
    // MediaPipe supone una imagen espejada (tipo selfie). Nuestro video llega sin
    // espejar, así que "Left" para el modelo es la mano derecha de la persona.
    const mano: Mano = lado === 'Left' ? 'Derecha' : 'Izquierda';

    return {
      codigo: gesto?.categoryName || CODIGO_NINGUNO,
      confianza: gesto?.score ?? 0,
      mano,
      puntos: r.landmarks[0].map(({ x, y, z }) => ({ x, y, z })),
    };
  }

  liberar(): void {
    this.modelo?.close();
    this.modelo = null;
    this.carga = null;
  }

  private async crear(): Promise<void> {
    const { FilesetResolver, GestureRecognizer } = await import('@mediapipe/tasks-vision');
    const archivosWasm = await FilesetResolver.forVisionTasks(new URL(environment.wasm, document.baseURI).href);
    const rutaModelo = await elegirModelo();

    const opciones = (delegate: 'GPU' | 'CPU'): GestureRecognizerOptions => ({
      baseOptions: { modelAssetPath: rutaModelo, delegate },
      runningMode: 'VIDEO',
      numHands: 1, // versión 1: una mano a la vez
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    try {
      this.modelo = await GestureRecognizer.createFromOptions(archivosWasm, opciones('GPU'));
    } catch {
      // Algunas laptops no tienen WebGL2: se usa el procesador, más lento pero funciona.
      this.modelo = await GestureRecognizer.createFromOptions(archivosWasm, opciones('CPU'));
    }
  }
}

/**
 * Usa el modelo guardado junto al frontend (SRS §2.4). Si no se descargó
 * con "npm run modelo", usa la copia oficial de Google.
 */
async function elegirModelo(): Promise<string> {
  const local = new URL(environment.modeloLocal, document.baseURI).href;
  try {
    const respuesta = await fetch(local, { method: 'HEAD' });
    const tipo = respuesta.headers.get('content-type') ?? '';
    if (respuesta.ok && !tipo.includes('text/html')) return local;
  } catch {
    /* sin modelo local */
  }
  console.warn('[GestoWeb] Modelo local no encontrado; se usa la copia en línea. Ejecuta "npm run modelo" para la demo sin internet.');
  return environment.modeloRemoto;
}
