import { DtoAccion, DtoAsignacion, DtoCambiarAsignacion, DtoGesto } from '../../dto/DtoAccion';
import { CasoDeUso } from './CasoDeUso';

/** GET /api/gestos */
export type ListarGestosPuerto = CasoDeUso<{ incluirInactivos?: boolean }, DtoGesto[]>;
/** GET /api/acciones */
export type ListarAccionesPuerto = CasoDeUso<{ incluirInactivas?: boolean }, DtoAccion[]>;
/** RF-11: qué acción ejecuta cada gesto para este usuario */
export type ObtenerAsignacionesPuerto = CasoDeUso<{ idUsuario: number }, DtoAsignacion[]>;
/** RF-12 */
export type CambiarAsignacionPuerto = CasoDeUso<DtoCambiarAsignacion, DtoAsignacion>;
/** RF-12: volver a la configuración inicial */
export type RestaurarAsignacionesPuerto = CasoDeUso<{ idUsuario: number }, DtoAsignacion[]>;
