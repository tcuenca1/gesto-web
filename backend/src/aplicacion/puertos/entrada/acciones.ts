import { CasoDeUso, SinValidar } from './CasoDeUso';
import { AccionDTO, AsignacionDTO, GestoDTO } from './dtos';

export interface EntradaCambiarAsignacion {
  idUsuario: number;
  idGesto: number;
  idAccion: SinValidar;
}

/** GET /api/gestos */
export type ListarGestosPuerto = CasoDeUso<{ incluirInactivos?: boolean }, GestoDTO[]>;
/** GET /api/acciones */
export type ListarAccionesPuerto = CasoDeUso<{ incluirInactivas?: boolean }, AccionDTO[]>;
/** RF-11: qué acción ejecuta cada gesto para este usuario */
export type ObtenerAsignacionesPuerto = CasoDeUso<{ idUsuario: number }, AsignacionDTO[]>;
/** RF-12 */
export type CambiarAsignacionPuerto = CasoDeUso<EntradaCambiarAsignacion, AsignacionDTO>;
/** RF-12: volver a la configuración inicial */
export type RestaurarAsignacionesPuerto = CasoDeUso<{ idUsuario: number }, AsignacionDTO[]>;
