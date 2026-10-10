import { ErrorNoAutenticado } from '../../../dominio/compartido/errores';
import { UsuarioPublico } from '../../../dominio/usuario/Usuario';
import { AutenticarSolicitudPuerto } from '../../puertos/entrada/usuarios';
import { GeneradorTokens } from '../../puertos/salida/servicios';
import { UsuarioRepositorio } from '../../puertos/salida/UsuarioRepositorio';

/**
 * RF-04 / RNF-07 · Convierte el token de una petición en el usuario que la hace.
 *
 * Además de validar el token, vuelve a leer el usuario: si un administrador
 * lo desactivó o le cambió el rol, el cambio vale de inmediato y no recién
 * cuando el token venza (8 horas).
 */
export class AutenticarSolicitud implements AutenticarSolicitudPuerto {
  constructor(
    private readonly tokens: GeneradorTokens,
    private readonly usuarios: UsuarioRepositorio,
  ) {}

  async ejecutar({ token }: { token: unknown }): Promise<UsuarioPublico> {
    if (typeof token !== 'string' || token === '') throw new ErrorNoAutenticado();
    const { idUsuario } = this.tokens.verificar(token);
    const usuario = await this.usuarios.buscarPorId(idUsuario);
    if (!usuario || !usuario.puedeIniciarSesion()) {
      throw new ErrorNoAutenticado('Tu sesión ya no es válida. Inicia sesión de nuevo.');
    }
    return usuario.aPublico();
  }
}
