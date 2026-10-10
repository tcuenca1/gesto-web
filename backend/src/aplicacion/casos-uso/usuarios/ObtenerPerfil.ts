import { ErrorNoEncontrado } from '../../../dominio/compartido/errores';
import { UsuarioPublico } from '../../../dominio/usuario/Usuario';
import { ObtenerPerfilPuerto } from '../../puertos/entrada/usuarios';
import { UsuarioRepositorio } from '../../puertos/salida/UsuarioRepositorio';

/** Ver mi perfil (GET /api/usuarios/yo). */
export class ObtenerPerfil implements ObtenerPerfilPuerto {
  constructor(private readonly usuarios: UsuarioRepositorio) {}

  async ejecutar({ idUsuario }: { idUsuario: number }): Promise<UsuarioPublico> {
    const usuario = await this.usuarios.buscarPorId(idUsuario);
    if (!usuario) throw new ErrorNoEncontrado('El usuario no existe');
    return usuario.aPublico();
  }
}
