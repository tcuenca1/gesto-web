import { resolverAccionEfectiva } from '../../../dominio/accion/Asignacion';
import { DtoAccion, DtoAsignacion, DtoGesto } from '../../dto/DtoAccion';
import { accionARespuesta, gestoARespuesta } from '../../dto/RespuestaAccion';
import { PuertoEntradaAccionLectura } from '../../puerto/entrada/PuertoEntradaAccionLectura';
import { PuertoSalidaAccion } from '../../puerto/salida/PuertoSalidaAccion';
import { PuertoSalidaAsignacion } from '../../puerto/salida/PuertoSalidaAsignacion';
import { PuertoSalidaGesto } from '../../puerto/salida/PuertoSalidaGesto';

/** Consultas de catálogos (gestos y acciones) y de asignaciones del usuario. */
export class CasoUso_AccionLectura extends PuertoEntradaAccionLectura {
  constructor(
    private readonly gestos: PuertoSalidaGesto,
    private readonly acciones: PuertoSalidaAccion,
    private readonly asignaciones: PuertoSalidaAsignacion,
  ) {
    super();
  }

  /** GET /api/gestos · Lista los gestos (por defecto, solo los activos). */
  async listarGestos({ incluirInactivos = false }: { incluirInactivos?: boolean }): Promise<DtoGesto[]> {
    const gestos = await this.gestos.listar({ soloActivos: !incluirInactivos });
    return gestos.map(gestoARespuesta);
  }

  /** GET /api/acciones · Lista las acciones (por defecto, solo las activas). */
  async listarAcciones({ incluirInactivas = false }: { incluirInactivas?: boolean }): Promise<DtoAccion[]> {
    const acciones = await this.acciones.listar({ soloActivas: !incluirInactivas });
    return acciones.map(accionARespuesta);
  }

  /**
   * RF-11 / RF-12 · Qué acción hace cada gesto activo para este usuario.
   * El frontend lo usa para saber qué ejecutar al aceptar un gesto.
   */
  async obtenerAsignaciones({ idUsuario }: { idUsuario: number }): Promise<DtoAsignacion[]> {
    const [gestos, acciones, asignaciones] = await Promise.all([
      this.gestos.listar({ soloActivos: true }),
      this.acciones.listar(),
      this.asignaciones.listarDeUsuario(idUsuario),
    ]);
    const accionesPorId = new Map(acciones.map((a) => [a.id, a]));
    const asignacionPorGesto = new Map(asignaciones.map((a) => [a.idGesto, a]));

    return gestos.map((gesto) => {
      const { accion, esPredeterminada } = resolverAccionEfectiva(gesto, asignacionPorGesto.get(gesto.id), accionesPorId);
      return { gesto: gestoARespuesta(gesto), accion: accion ? accionARespuesta(accion) : null, esPredeterminada };
    });
  }
}
