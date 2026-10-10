import { Accion } from '../../../dominio/accion/Accion';
import { ErrorConflicto, ErrorNoEncontrado } from '../../../dominio/compartido/errores';
import { AccionDTO } from '../../puertos/entrada/dtos';
import { GestionarAccionesPuerto, OperacionAccion } from '../../puertos/entrada/administracion';
import { RepositoriosTransaccionales, UnidadDeTrabajo } from '../../puertos/salida/UnidadDeTrabajo';
import { accionADto } from '../comun';

/**
 * RF-19 · El administrador gestiona el catálogo de acciones.
 *
 * "Eliminar" es un borrado lógico (activa = false): las detecciones antiguas
 * siguen apuntando a la acción, así el historial nunca pierde información.
 */
export class GestionarAcciones implements GestionarAccionesPuerto {
  constructor(private readonly unidad: UnidadDeTrabajo) {}

  ejecutar(entrada: OperacionAccion & { idAdministrador: number }): Promise<AccionDTO> {
    return this.unidad.ejecutar(async (repos) => {
      switch (entrada.tipo) {
        case 'crear':
          return this.crear(repos, entrada.idAdministrador, entrada.datos);
        case 'editar':
          return this.editar(repos, entrada.idAdministrador, entrada.idAccion, entrada.datos, 'UPDATE');
        case 'desactivar':
          return this.editar(repos, entrada.idAdministrador, entrada.idAccion, { activa: false }, 'DELETE');
      }
    });
  }

  private async crear(
    { acciones, bitacora }: RepositoriosTransaccionales,
    idAdministrador: number,
    datos: { codigo?: unknown; nombre?: unknown; descripcion?: unknown },
  ): Promise<AccionDTO> {
    const nueva = Accion.validarNueva(datos);
    if (await acciones.buscarPorCodigo(nueva.codigo)) {
      throw new ErrorConflicto(`Ya existe una acción con el código ${nueva.codigo}`);
    }
    const accion = await acciones.crear(nueva);
    await bitacora.registrar({
      idUsuario: idAdministrador,
      tablaAfectada: 'acciones',
      operacion: 'INSERT',
      detalle: { despues: accion.aDatos() },
    });
    return accionADto(accion);
  }

  private async editar(
    { acciones, bitacora }: RepositoriosTransaccionales,
    idAdministrador: number,
    idAccion: number,
    cambios: { nombre?: unknown; descripcion?: unknown; activa?: unknown },
    operacion: 'UPDATE' | 'DELETE',
  ): Promise<AccionDTO> {
    const accion = await acciones.buscarPorId(idAccion);
    if (!accion) throw new ErrorNoEncontrado('La acción no existe');
    const antes = accion.aDatos();

    if (cambios.activa === false && accion.activa) {
      if (accion.esNinguna()) throw new ErrorConflicto('La acción NINGUNA no se puede desactivar');
      if (await acciones.esPredeterminadaDeAlgunGesto(accion.id)) {
        throw new ErrorConflicto('Esta acción es la predeterminada de un gesto: cambia primero ese gesto');
      }
    }

    accion.editar(cambios);
    await acciones.actualizar(accion);
    await bitacora.registrar({
      idUsuario: idAdministrador,
      tablaAfectada: 'acciones',
      operacion,
      detalle: { antes, despues: accion.aDatos() },
    });
    return accionADto(accion);
  }
}
