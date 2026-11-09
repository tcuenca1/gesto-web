import { Accion } from '../../../dominio/accion/Accion';
import { ErrorConflicto, ErrorNoEncontrado, ErrorValidacion } from '../../../dominio/compartido/errores';
import { Usuario, UsuarioPublico } from '../../../dominio/usuario/Usuario';
import { DtoAccion, DtoGesto } from '../../dto/DtoAccion';
import { DtoConAdministrador, DtoEditarGesto, DtoGestionarUsuario, DtoOperacionAccion } from '../../dto/DtoAdministracion';
import { accionARespuesta, gestoARespuesta } from '../../dto/RespuestaAccion';
import { usuarioARespuesta } from '../../dto/RespuestaUsuario';
import { PuertoEntradaAdministracionEscritura } from '../../puerto/entrada/PuertoEntradaAdministracionEscritura';
import { PuertoSalidaUnidadDeTrabajo, RepositoriosTransaccionales } from '../../puerto/salida/PuertoSalidaUnidadDeTrabajo';

/**
 * Cambios del administrador. Cada cambio y su registro en la bitácora (RF-22)
 * se guardan en la misma transacción: o se guardan los dos o ninguno.
 */
export class CasoUso_AdministracionEscritura extends PuertoEntradaAdministracionEscritura {
  constructor(private readonly unidad: PuertoSalidaUnidadDeTrabajo) {
    super();
  }

  /**
   * RF-18 · El administrador activa o desactiva un gesto y edita su nombre,
   * descripción y confianza mínima.
   */
  editarGesto(dto: DtoEditarGesto): Promise<DtoGesto> {
    return this.unidad.ejecutar(async ({ gestos, bitacora }) => {
      const gesto = await gestos.buscarPorId(dto.idGesto);
      if (!gesto) throw new ErrorNoEncontrado('El gesto no existe');

      const antes = gesto.aDatos();
      gesto.editar(dto.cambios);
      await gestos.actualizar(gesto);

      await bitacora.registrar({
        idUsuario: dto.idAdministrador,
        tablaAfectada: 'gestos',
        operacion: 'UPDATE',
        detalle: { antes, despues: gesto.aDatos() },
      });
      return gestoARespuesta(gesto);
    });
  }

  /**
   * RF-19 · El administrador gestiona el catálogo de acciones.
   *
   * "Eliminar" es un borrado lógico (activa = false): las detecciones antiguas
   * siguen apuntando a la acción, así el historial nunca pierde información.
   */
  gestionarAccion(dto: DtoOperacionAccion & DtoConAdministrador): Promise<DtoAccion> {
    return this.unidad.ejecutar(async (repos) => {
      switch (dto.tipo) {
        case 'crear':
          return this.crearAccion(repos, dto.idAdministrador, dto.datos);
        case 'editar':
          return this.editarAccion(repos, dto.idAdministrador, dto.idAccion, dto.datos, 'UPDATE');
        case 'desactivar':
          return this.editarAccion(repos, dto.idAdministrador, dto.idAccion, { activa: false }, 'DELETE');
      }
    });
  }

  /**
   * RF-20 · El administrador cambia el rol o el estado de un usuario.
   * Regla de seguridad: nadie puede quitarse su propio rol de administrador
   * ni desactivarse a sí mismo (el sistema podría quedarse sin administradores).
   */
  gestionarUsuario(dto: DtoGestionarUsuario): Promise<UsuarioPublico> {
    return this.unidad.ejecutar(async ({ usuarios, bitacora }) => {
      const usuario = await usuarios.buscarPorId(dto.idUsuario);
      if (!usuario) throw new ErrorNoEncontrado('El usuario no existe');

      const { rol, activo } = dto.cambios;
      if (rol === undefined && activo === undefined) throw new ErrorValidacion('No hay cambios para guardar');
      if (activo !== undefined && typeof activo !== 'boolean') throw new ErrorValidacion('"activo" debe ser verdadero o falso');

      if (usuario.id === dto.idAdministrador) {
        const pierdeAdmin = rol !== undefined && Usuario.validarRol(rol) !== 'ADMIN';
        if (pierdeAdmin || activo === false) {
          throw new ErrorConflicto('No puedes quitarte tu propio rol de administrador ni desactivar tu cuenta');
        }
      }

      const antes = usuarioARespuesta(usuario);
      if (rol !== undefined) usuario.cambiarRol(rol);
      if (typeof activo === 'boolean') usuario.cambiarEstado(activo);
      await usuarios.actualizar(usuario);

      const despues = usuarioARespuesta(usuario);
      await bitacora.registrar({
        idUsuario: dto.idAdministrador,
        tablaAfectada: 'usuarios',
        operacion: 'UPDATE',
        detalle: {
          antes: { id: antes.id, correo: antes.correo, rol: antes.rol, activo: antes.activo },
          despues: { id: despues.id, correo: despues.correo, rol: despues.rol, activo: despues.activo },
        },
      });
      return despues;
    });
  }

  private async crearAccion(
    { acciones, bitacora }: RepositoriosTransaccionales,
    idAdministrador: number,
    datos: { codigo?: unknown; nombre?: unknown; descripcion?: unknown },
  ): Promise<DtoAccion> {
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
    return accionARespuesta(accion);
  }

  private async editarAccion(
    { acciones, bitacora }: RepositoriosTransaccionales,
    idAdministrador: number,
    idAccion: number,
    cambios: { nombre?: unknown; descripcion?: unknown; activa?: unknown },
    operacion: 'UPDATE' | 'DELETE',
  ): Promise<DtoAccion> {
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
    return accionARespuesta(accion);
  }
}
