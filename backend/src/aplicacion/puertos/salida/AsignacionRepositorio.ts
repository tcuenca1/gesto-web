import { Asignacion } from '../../../dominio/accion/Asignacion';

/** Puerto de salida: qué acción hace cada gesto para cada usuario. */
export interface AsignacionRepositorio {
  listarDeUsuario(idUsuario: number): Promise<Asignacion[]>;
  /** Crea o reemplaza la asignación de un gesto. */
  guardar(idUsuario: number, idGesto: number, idAccion: number): Promise<Asignacion>;
  /** Vuelve a la acción por defecto de cada gesto. */
  restaurar(idUsuario: number): Promise<void>;
}
