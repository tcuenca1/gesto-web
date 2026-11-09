import { ErrorConflicto, ErrorNoEncontrado, ErrorValidacion } from '../../../dominio/compartido/errores';
import { DtoAsignacion } from '../../dto/DtoAccion';
import { CambiarAsignacionPuerto } from '../../puertos/entrada/acciones';
import { DtoCambiarAsignacion } from '../../dto/DtoAccion';
import { PuertoSalidaAccion } from '../../puerto/salida/PuertoSalidaAccion';
import { PuertoSalidaAsignacion } from '../../puerto/salida/PuertoSalidaAsignacion';
import { PuertoSalidaGesto } from '../../puerto/salida/PuertoSalidaGesto';
import { accionARespuesta, gestoARespuesta } from '../../dto/RespuestaAccion';
import { leerEnteroPositivo } from '../comun';

/** RF-12 · El usuario cambia qué acción hace un gesto. */
export class CambiarAsignacion implements CambiarAsignacionPuerto {
  constructor(
    private readonly gestos: PuertoSalidaGesto,
    private readonly acciones: PuertoSalidaAccion,
    private readonly asignaciones: PuertoSalidaAsignacion,
  ) {}

  async ejecutar(entrada: DtoCambiarAsignacion): Promise<DtoAsignacion> {
    const idAccion = leerEnteroPositivo(entrada.idAccion, 'idAccion');

    const gesto = await this.gestos.buscarPorId(entrada.idGesto);
    if (!gesto) throw new ErrorNoEncontrado('El gesto no existe');
    if (!gesto.activo) throw new ErrorConflicto('Ese gesto está desactivado');

    const accion = await this.acciones.buscarPorId(idAccion);
    if (!accion) throw new ErrorValidacion('La acción elegida no existe');
    if (!accion.activa) throw new ErrorConflicto('La acción elegida está desactivada');

    await this.asignaciones.guardar(entrada.idUsuario, gesto.id, accion.id);
    return {
      gesto: gestoARespuesta(gesto),
      accion: accionARespuesta(accion),
      esPredeterminada: accion.id === gesto.idAccionPredeterminada,
    };
  }
}
