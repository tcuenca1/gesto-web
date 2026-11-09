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
