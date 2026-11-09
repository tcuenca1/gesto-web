import { Accion, NuevaAccion } from '../../../dominio/accion/Accion';

/** Puerto de salida: leer y editar el catálogo de acciones. */
export abstract class PuertoSalidaAccion {
  abstract listar(opciones?: { soloActivas?: boolean }): Promise<Accion[]>;
  abstract buscarPorId(id: number): Promise<Accion | null>;
  abstract buscarPorCodigo(codigo: string): Promise<Accion | null>;
  abstract crear(nueva: NuevaAccion): Promise<Accion>;
  abstract actualizar(accion: Accion): Promise<void>;
  /** ¿Algún gesto la usa como acción por defecto? */
  abstract esPredeterminadaDeAlgunGesto(idAccion: number): Promise<boolean>;
}
