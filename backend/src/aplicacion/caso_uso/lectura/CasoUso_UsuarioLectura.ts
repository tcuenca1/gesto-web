import { ErrorNoAutenticado, ErrorNoEncontrado } from '../../../dominio/compartido/errores';
import { UsuarioPublico } from '../../../dominio/usuario/Usuario';
import { usuarioARespuesta } from '../../dto/RespuestaUsuario';
import { PuertoEntradaUsuarioLectura } from '../../puerto/entrada/PuertoEntradaUsuarioLectura';
import { PuertoSalidaTokens } from '../../puerto/salida/PuertoSalidaTokens';
import { PuertoSalidaUsuario } from '../../puerto/salida/PuertoSalidaUsuario';

/** Consultas del módulo Usuario. */
export class CasoUso_UsuarioLectura extends PuertoEntradaUsuarioLectura {
  constructor(
    private readonly usuarios: PuertoSalidaUsuario,
    private readonly tokens: PuertoSalidaTokens,
  ) {
    super();
  }

  /** Ver mi perfil (GET /api/usuarios/yo). */
  async obtenerPerfil({ idUsuario }: { idUsuario: number }): Promise<UsuarioPublico> {
    const usuario = await this.usuarios.buscarPorId(idUsuario);
    if (!usuario) throw new ErrorNoEncontrado('El usuario no existe');
    return usuarioARespuesta(usuario);
  }

  /**
   * RF-04 / RNF-07 · Convierte el token de una petición en el usuario que la hace.
   *
   * Además de validar el token, vuelve a leer el usuario: si un administrador
   * lo desactivó o le cambió el rol, el cambio vale de inmediato y no recién
   * cuando el token venza (8 horas).
   */
  async autenticarSolicitud({ token }: { token: unknown }): Promise<UsuarioPublico> {
    if (typeof token !== 'string' || token === '') throw new ErrorNoAutenticado();
    const { idUsuario } = this.tokens.verificar(token);
    const usuario = await this.usuarios.buscarPorId(idUsuario);
    if (!usuario || !usuario.puedeIniciarSesion()) {
      throw new ErrorNoAutenticado('Tu sesión ya no es válida. Inicia sesión de nuevo.');
    }
    return usuarioARespuesta(usuario);
  }
}
