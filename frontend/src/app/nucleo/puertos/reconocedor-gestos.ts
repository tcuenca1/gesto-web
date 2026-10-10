import { ResultadoReconocimiento } from '../dominio/gesto';

/**
 * Puerto ReconocedorGestos (SRS §7.4): recibe una imagen y devuelve gesto,
 * confianza y mano. Adaptador de la versión 1: MediaPipe.
 *
 * Es una clase abstracta (y no una interface) porque Angular la usa como
 * "token" de inyección de dependencias: los componentes piden un
 * ReconocedorGestos y app.config.ts decide qué adaptador entregar.
 */
export abstract class ReconocedorGestos {
  /** Descarga y prepara el modelo. Se puede llamar varias veces. */
  abstract cargar(): Promise<void>;

  /**
   * Analiza la imagen actual del video.
   * @returns null si no ve ninguna mano.
   */
  abstract reconocer(fuente: HTMLVideoElement, marcaTiempoMs: number): ResultadoReconocimiento | null;

  /** Libera la memoria del modelo. */
  abstract liberar(): void;
}
