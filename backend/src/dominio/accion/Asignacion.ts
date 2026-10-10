import { Gesto } from '../gesto/Gesto';
import { Accion } from './Accion';

/** Qué acción hace un gesto para un usuario concreto (RF-12). */
export interface Asignacion {
  idUsuario: number;
  idGesto: number;
  idAccion: number;
  fechaActualizacion: Date;
}

export interface AccionEfectiva {
  accion: Accion | null;
  /** true si es la acción por defecto del gesto (el usuario no la cambió). */
  esPredeterminada: boolean;
}

/**
 * Regla de negocio: ¿qué acción ejecuta realmente un gesto para un usuario?
 *
 * 1. La que el usuario eligió, si sigue activa.
 * 2. Si no eligió nada o su acción fue desactivada, la acción por defecto del gesto.
 * 3. Si tampoco está activa, ninguna (null).
 *
 * Gracias a esta regla el núcleo funciona aunque la base de datos no tenga
 * el trigger de asignaciones iniciales (por ejemplo, con repositorios en memoria).
 */
export function resolverAccionEfectiva(
  gesto: Gesto,
  asignacion: Asignacion | undefined,
  accionesPorId: ReadonlyMap<number, Accion>,
): AccionEfectiva {
  const elegida = asignacion ? accionesPorId.get(asignacion.idAccion) : undefined;
  if (elegida?.activa) {
    return { accion: elegida, esPredeterminada: elegida.id === gesto.idAccionPredeterminada };
  }
  const predeterminada = accionesPorId.get(gesto.idAccionPredeterminada);
  if (predeterminada?.activa) return { accion: predeterminada, esPredeterminada: true };
  return { accion: null, esPredeterminada: true };
}
