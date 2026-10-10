import { ErrorConflicto, ErrorNoEncontrado, ErrorValidacion } from '../../../dominio/compartido/errores';
import { AsignacionDTO } from '../../puertos/entrada/dtos';
import { CambiarAsignacionPuerto, EntradaCambiarAsignacion } from '../../puertos/entrada/acciones';
import { AccionRepositorio } from '../../puertos/salida/AccionRepositorio';
import { AsignacionRepositorio } from '../../puertos/salida/AsignacionRepositorio';
import { GestoRepositorio } from '../../puertos/salida/GestoRepositorio';
import { accionADto, gestoADto, leerEnteroPositivo } from '../comun';

/** RF-12 · El usuario cambia qué acción hace un gesto. */
export class CambiarAsignacion implements CambiarAsignacionPuerto {
  constructor(
    private readonly gestos: GestoRepositorio,
    private readonly acciones: AccionRepositorio,
    private readonly asignaciones: AsignacionRepositorio,
  ) {}

  async ejecutar(entrada: EntradaCambiarAsignacion): Promise<AsignacionDTO> {
    const idAccion = leerEnteroPositivo(entrada.idAccion, 'idAccion');

    const gesto = await this.gestos.buscarPorId(entrada.idGesto);
    if (!gesto) throw new ErrorNoEncontrado('El gesto no existe');
    if (!gesto.activo) throw new ErrorConflicto('Ese gesto está desactivado');

    const accion = await this.acciones.buscarPorId(idAccion);
    if (!accion) throw new ErrorValidacion('La acción elegida no existe');
    if (!accion.activa) throw new ErrorConflicto('La acción elegida está desactivada');

    await this.asignaciones.guardar(entrada.idUsuario, gesto.id, accion.id);
    return {
      gesto: gestoADto(gesto),
      accion: accionADto(accion),
      esPredeterminada: accion.id === gesto.idAccionPredeterminada,
    };
  }
}
