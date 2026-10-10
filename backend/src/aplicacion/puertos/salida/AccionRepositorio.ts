import { Accion, NuevaAccion } from '../../../dominio/accion/Accion';

/** Puerto de salida: leer y editar el catálogo de acciones. */
export interface AccionRepositorio {
  listar(opciones?: { soloActivas?: boolean }): Promise<Accion[]>;
  buscarPorId(id: number): Promise<Accion | null>;
  buscarPorCodigo(codigo: string): Promise<Accion | null>;
  crear(nueva: NuevaAccion): Promise<Accion>;
  actualizar(accion: Accion): Promise<void>;
  /** ¿Algún gesto la usa como acción por defecto? */
  esPredeterminadaDeAlgunGesto(idAccion: number): Promise<boolean>;
}
