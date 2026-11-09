import { DtoAbrirSesion, DtoCerrarSesion, DtoDeteccion, DtoRegistrarDeteccion, DtoSesion } from '../../dto/DtoReconocimiento';

/** CU-03: sesiones de reconocimiento y detecciones. */
export abstract class PuertoEntradaReconocimientoEscritura {
  /** CU-03 paso 3 */
  abstract abrirSesion(dto: DtoAbrirSesion): Promise<DtoSesion>;
  /** RF-14 / CU-03 paso 8 */
  abstract registrarDeteccion(dto: DtoRegistrarDeteccion): Promise<DtoDeteccion>;
  /** CU-03 paso 9 */
  abstract cerrarSesion(dto: DtoCerrarSesion): Promise<DtoSesion>;
}
