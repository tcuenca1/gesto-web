/**
 * Puerto Camara (SRS §7.4): enciende, apaga y entrega imágenes en un <video>.
 * Adaptador de la versión 1: la cámara del navegador (getUserMedia).
 */
export abstract class Camara {
  abstract encender(video: HTMLVideoElement): Promise<void>;
  abstract apagar(): void;
  abstract get encendida(): boolean;
}

export type MotivoErrorCamara =
  | 'SITIO_INSEGURO'
  | 'NO_SOPORTADA'
  | 'SIN_CAMARA'
  | 'PERMISO_NEGADO'
  | 'OCUPADA'
  | 'DESCONOCIDO';

/** Error de cámara con un mensaje claro para el usuario (RF-10). */
export class ErrorCamara extends Error {
  constructor(
    public readonly motivo: MotivoErrorCamara,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ErrorCamara';
  }
}
