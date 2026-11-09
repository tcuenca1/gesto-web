export type OperacionBitacora = 'INSERT' | 'UPDATE' | 'DELETE';

export interface NuevaEntradaBitacora {
  idUsuario: number;
  tablaAfectada: string;
  operacion: OperacionBitacora;
  /** Valores antes y después del cambio. */
  detalle: { antes?: unknown; despues?: unknown } | null;
}

export interface EntradaBitacora extends NuevaEntradaBitacora {
  id: number;
  nombreUsuario: string;
  fechaHora: Date;
}

/** Puerto de salida: registrar los cambios hechos por administradores (RF-22). */
export abstract class PuertoSalidaBitacora {
  abstract registrar(entrada: NuevaEntradaBitacora): Promise<void>;
  abstract listar(pagina: number, limite: number): Promise<{ elementos: EntradaBitacora[]; total: number }>;
}
