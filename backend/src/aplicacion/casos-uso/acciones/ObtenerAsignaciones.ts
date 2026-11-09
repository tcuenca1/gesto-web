import { resolverAccionEfectiva } from '../../../dominio/accion/Asignacion';
import { AsignacionDTO } from '../../puertos/entrada/dtos';
import { ObtenerAsignacionesPuerto } from '../../puertos/entrada/acciones';
import { PuertoSalidaAccion } from '../../puerto/salida/PuertoSalidaAccion';
import { PuertoSalidaAsignacion } from '../../puerto/salida/PuertoSalidaAsignacion';
import { PuertoSalidaGesto } from '../../puerto/salida/PuertoSalidaGesto';
import { accionADto, gestoADto } from '../comun';

/**
 * RF-11 / RF-12 · Qué acción hace cada gesto activo para este usuario.
 * El frontend lo usa para saber qué ejecutar al aceptar un gesto.
 */
export class ObtenerAsignaciones implements ObtenerAsignacionesPuerto {
  constructor(
    private readonly gestos: PuertoSalidaGesto,
    private readonly acciones: PuertoSalidaAccion,
    private readonly asignaciones: PuertoSalidaAsignacion,
  ) {}

  async ejecutar({ idUsuario }: { idUsuario: number }): Promise<AsignacionDTO[]> {
    const [gestos, acciones, asignaciones] = await Promise.all([
      this.gestos.listar({ soloActivos: true }),
      this.acciones.listar(),
      this.asignaciones.listarDeUsuario(idUsuario),
    ]);
    const accionesPorId = new Map(acciones.map((a) => [a.id, a]));
    const asignacionPorGesto = new Map(asignaciones.map((a) => [a.idGesto, a]));

    return gestos.map((gesto) => {
      const { accion, esPredeterminada } = resolverAccionEfectiva(gesto, asignacionPorGesto.get(gesto.id), accionesPorId);
      return { gesto: gestoADto(gesto), accion: accion ? accionADto(accion) : null, esPredeterminada };
    });
  }
}
