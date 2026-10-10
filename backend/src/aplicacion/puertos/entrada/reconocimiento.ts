import { CasoDeUso, SinValidar } from './CasoDeUso';
import { DeteccionDTO, SesionDTO } from './dtos';

export interface EntradaAbrirSesion {
  idUsuario: number;
  navegador?: SinValidar;
}

export interface EntradaRegistrarDeteccion {
  idUsuario: number;
  idSesion: number;
  codigoGesto: SinValidar;
  confianza: SinValidar;
  mano: SinValidar;
  fechaHora?: SinValidar;
}

export interface EntradaCerrarSesion {
  idUsuario: number;
  idSesion: number;
}

/** CU-03 paso 3 */
export type AbrirSesionReconocimientoPuerto = CasoDeUso<EntradaAbrirSesion, SesionDTO>;
/** RF-14 / CU-03 paso 8 */
export type RegistrarDeteccionPuerto = CasoDeUso<EntradaRegistrarDeteccion, DeteccionDTO>;
/** CU-03 paso 9 */
export type CerrarSesionReconocimientoPuerto = CasoDeUso<EntradaCerrarSesion, SesionDTO>;
