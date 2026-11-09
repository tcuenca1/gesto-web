import { DtoAbrirSesion, DtoCerrarSesion, DtoDeteccion, DtoRegistrarDeteccion, DtoSesion } from '../../dto/DtoReconocimiento';
import { CasoDeUso } from './CasoDeUso';

/** CU-03 paso 3 */
export type AbrirSesionReconocimientoPuerto = CasoDeUso<DtoAbrirSesion, DtoSesion>;
/** RF-14 / CU-03 paso 8 */
export type RegistrarDeteccionPuerto = CasoDeUso<DtoRegistrarDeteccion, DtoDeteccion>;
/** CU-03 paso 9 */
export type CerrarSesionReconocimientoPuerto = CasoDeUso<DtoCerrarSesion, DtoSesion>;
