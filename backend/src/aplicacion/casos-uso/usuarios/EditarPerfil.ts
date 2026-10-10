import { ErrorNoEncontrado, ErrorValidacion } from '../../../dominio/compartido/errores';
import { Usuario, UsuarioPublico } from '../../../dominio/usuario/Usuario';
import { EditarPerfilPuerto, EntradaEditarPerfil } from '../../puertos/entrada/usuarios';
import { CifradorContrasenas } from '../../puertos/salida/servicios';
import { UsuarioRepositorio } from '../../puertos/salida/UsuarioRepositorio';

/** RF-05 · Editar el nombre y cambiar la contraseña (confirmando la actual). */
export class EditarPerfil implements EditarPerfilPuerto {
  constructor(
    private readonly usuarios: UsuarioRepositorio,
    private readonly cifrador: CifradorContrasenas,
  ) {}

  async ejecutar(entrada: EntradaEditarPerfil): Promise<UsuarioPublico> {
    const usuario = await this.usuarios.buscarPorId(entrada.idUsuario);
    if (!usuario) throw new ErrorNoEncontrado('El usuario no existe');

    const cambiaNombre = entrada.nombre !== undefined;
    const cambiaContrasena = entrada.contrasenaNueva !== undefined && entrada.contrasenaNueva !== '';
    if (!cambiaNombre && !cambiaContrasena) throw new ErrorValidacion('No hay cambios para guardar');

    if (cambiaNombre) usuario.cambiarNombre(entrada.nombre);

    if (cambiaContrasena) {
      const nueva = Usuario.validarContrasena(entrada.contrasenaNueva);
      const actual = typeof entrada.contrasenaActual === 'string' ? entrada.contrasenaActual : '';
      if (!(await this.cifrador.comparar(actual, usuario.contrasenaHash))) {
        throw new ErrorValidacion('La contraseña actual no es correcta');
      }
      usuario.cambiarContrasenaHash(await this.cifrador.cifrar(nueva));
    }

    await this.usuarios.actualizar(usuario);
    return usuario.aPublico();
  }
}
