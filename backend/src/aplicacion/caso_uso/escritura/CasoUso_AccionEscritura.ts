import { ErrorConflicto, ErrorNoEncontrado, ErrorValidacion } from '../../../dominio/compartido/errores';
import { DtoAsignacion, DtoCambiarAsignacion } from '../../dto/DtoAccion';
import { accionARespuesta, gestoARespuesta } from '../../dto/RespuestaAccion';
import { PuertoEntradaAccionEscritura } from '../../puerto/entrada/PuertoEntradaAccionEscritura';
import { PuertoEntradaAccionLectura } from '../../puerto/entrada/PuertoEntradaAccionLectura';
import { PuertoSalidaAccion } from '../../puerto/salida/PuertoSalidaAccion';
import { PuertoSalidaAsignacion } from '../../puerto/salida/PuertoSalidaAsignacion';
import { PuertoSalidaGesto } from '../../puerto/salida/PuertoSalidaGesto';
import { leerEnteroPositivo } from '../comun';

/** Cambios en qué acción hace cada gesto para el usuario. */
export class CasoUso_AccionEscritura extends PuertoEntradaAccionEscritura {
  constructor(
    private readonly gestos: PuertoSalidaGesto,
    private readonly acciones: PuertoSalidaAccion,
    private readonly asignaciones: PuertoSalidaAsignacion,
    /** Para devolver cómo quedaron las asignaciones después de restaurar. */
    private readonly cuLectura: PuertoEntradaAccionLectura,
  ) {
    super();
  }

  /** RF-12 · El usuario cambia qué acción hace un gesto. */
  async cambiarAsignacion(dto: DtoCambiarAsignacion): Promise<DtoAsignacion> {
    const idGesto = leerEnteroPositivo(dto.idGesto, 'id');
    const idAccion = leerEnteroPositivo(dto.idAccion, 'idAccion');

    const gesto = await this.gestos.buscarPorId(idGesto);
    if (!gesto) throw new ErrorNoEncontrado('El gesto no existe');
    if (!gesto.activo) throw new ErrorConflicto('Ese gesto está desactivado');

    const accion = await this.acciones.buscarPorId(idAccion);
    if (!accion) throw new ErrorValidacion('La acción elegida no existe');
    if (!accion.activa) throw new ErrorConflicto('La acción elegida está desactivada');

    await this.asignaciones.guardar(dto.idUsuario, gesto.id, accion.id);
    return {
      gesto: gestoARespuesta(gesto),
      accion: accionARespuesta(accion),
      esPredeterminada: accion.id === gesto.idAccionPredeterminada,
    };
  }

  /** RF-12 · Vuelve a la configuración inicial y devuelve cómo quedó. */
  async restaurarAsignaciones({ idUsuario }: { idUsuario: number }): Promise<DtoAsignacion[]> {
    await this.asignaciones.restaurar(idUsuario);
    return this.cuLectura.obtenerAsignaciones({ idUsuario });
  }
}
