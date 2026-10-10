import { ErrorConflicto } from '../../../dominio/compartido/errores';
import { Usuario, UsuarioPublico } from '../../../dominio/usuario/Usuario';
import { EntradaRegistro, RegistrarUsuarioPuerto } from '../../puertos/entrada/usuarios';
import { CifradorContrasenas } from '../../puertos/salida/servicios';
import { UsuarioRepositorio } from '../../puertos/salida/UsuarioRepositorio';

/**
 * RF-01 · Un visitante crea su cuenta con nombre, correo y contraseña.
 * Toda cuenta nueva nace con el rol USUARIO.
 */
export class RegistrarUsuario implements RegistrarUsuarioPuerto {
  constructor(
    private readonly usuarios: UsuarioRepositorio,
    private readonly cifrador: CifradorContrasenas,
  ) {}

  async ejecutar(entrada: EntradaRegistro): Promise<UsuarioPublico> {
    const nombre = Usuario.validarNombre(entrada.nombre);
    const correo = Usuario.normalizarCorreo(entrada.correo);
    const contrasena = Usuario.validarContrasena(entrada.contrasena);

    if (await this.usuarios.buscarPorCorreo(correo)) {
      throw new ErrorConflicto('Ya existe una cuenta con ese correo');
    }

    const contrasenaHash = await this.cifrador.cifrar(contrasena);
    const usuario = await this.usuarios.crear({ nombre, correo, contrasenaHash, rol: 'USUARIO' });
    return usuario.aPublico();
  }
}
