import { ErrorConflicto } from '../../../dominio/compartido/errores';
import { Usuario, UsuarioPublico } from '../../../dominio/usuario/Usuario';
import { DtoRegistroUsuario } from '../../dto/DtoUsuario';
import { RegistrarUsuarioPuerto } from '../../puertos/entrada/usuarios';
import { PuertoSalidaCifrador } from '../../puerto/salida/PuertoSalidaCifrador';
import { PuertoSalidaUsuario } from '../../puerto/salida/PuertoSalidaUsuario';

/**
 * RF-01 · Un visitante crea su cuenta con nombre, correo y contraseña.
 * Toda cuenta nueva nace con el rol USUARIO.
 */
export class RegistrarUsuario implements RegistrarUsuarioPuerto {
  constructor(
    private readonly usuarios: PuertoSalidaUsuario,
    private readonly cifrador: PuertoSalidaCifrador,
  ) {}

  async ejecutar(entrada: DtoRegistroUsuario): Promise<UsuarioPublico> {
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
