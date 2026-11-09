import { DtoAccion, DtoAsignacion, DtoGesto } from '../../dto/DtoAccion';

/** Consultas de catálogos y asignaciones. */
export abstract class PuertoEntradaAccionLectura {
  /** GET /api/gestos */
  abstract listarGestos(dto: { incluirInactivos?: boolean }): Promise<DtoGesto[]>;
  /** GET /api/acciones */
  abstract listarAcciones(dto: { incluirInactivas?: boolean }): Promise<DtoAccion[]>;
  /** RF-11: qué acción ejecuta cada gesto para este usuario */
  abstract obtenerAsignaciones(dto: { idUsuario: number }): Promise<DtoAsignacion[]>;
}
