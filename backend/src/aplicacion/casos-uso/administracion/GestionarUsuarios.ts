import { ErrorConflicto, ErrorNoEncontrado, ErrorValidacion } from '../../../dominio/compartido/errores';
import { Usuario, UsuarioPublico } from '../../../dominio/usuario/Usuario';
import {
  EntradaGestionarUsuario,
  GestionarUsuariosPuerto,
  ListarUsuariosPuerto,
} from '../../puertos/entrada/administracion';
import { UnidadDeTrabajo } from '../../puertos/salida/UnidadDeTrabajo';
import { UsuarioRepositorio } from '../../puertos/salida/UsuarioRepositorio';

/** RF-20 · El administrador ve la lista de usuarios. */
export class ListarUsuarios implements ListarUsuariosPuerto {
  constructor(private readonly usuarios: UsuarioRepositorio) {}

  async ejecutar(): Promise<UsuarioPublico[]> {
    return (await this.usuarios.listar()).map((u) => u.aPublico());
  }
}

/**
 * RF-20 · El administrador cambia el rol o el estado de un usuario.
 * Regla de seguridad: nadie puede quitarse su propio rol de administrador
 * ni desactivarse a sí mismo (el sistema podría quedarse sin administradores).
 */
export class GestionarUsuarios implements GestionarUsuariosPuerto {
  constructor(private readonly unidad: UnidadDeTrabajo) {}

  ejecutar(entrada: EntradaGestionarUsuario): Promise<UsuarioPublico> {
    return this.unidad.ejecutar(async ({ usuarios, bitacora }) => {
      const usuario = await usuarios.buscarPorId(entrada.idUsuario);
      if (!usuario) throw new ErrorNoEncontrado('El usuario no existe');

      const { rol, activo } = entrada.cambios;
      if (rol === undefined && activo === undefined) throw new ErrorValidacion('No hay cambios para guardar');
      if (activo !== undefined && typeof activo !== 'boolean') throw new ErrorValidacion('"activo" debe ser verdadero o falso');

      if (usuario.id === entrada.idAdministrador) {
        const pierdeAdmin = rol !== undefined && Usuario.validarRol(rol) !== 'ADMIN';
        if (pierdeAdmin || activo === false) {
          throw new ErrorConflicto('No puedes quitarte tu propio rol de administrador ni desactivar tu cuenta');
        }
      }

      const antes = usuario.aPublico();
      if (rol !== undefined) usuario.cambiarRol(rol);
      if (typeof activo === 'boolean') usuario.cambiarEstado(activo);
      await usuarios.actualizar(usuario);

      const despues = usuario.aPublico();
      await bitacora.registrar({
        idUsuario: entrada.idAdministrador,
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
}
