import { DtoAsignacion, DtoCambiarAsignacion } from '../../dto/DtoAccion';

/** Cambios en las asignaciones gesto → acción del usuario. */
export abstract class PuertoEntradaAccionEscritura {
  /** RF-12 */
  abstract cambiarAsignacion(dto: DtoCambiarAsignacion): Promise<DtoAsignacion>;
  /** RF-12: volver a la configuración inicial */
  abstract restaurarAsignaciones(dto: { idUsuario: number }): Promise<DtoAsignacion[]>;
}
