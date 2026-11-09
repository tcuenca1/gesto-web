import { UsuarioPublico } from '../../../dominio/usuario/Usuario';
import { SinValidar } from '../../dto/DtoComun';

/** Consultas del módulo Usuario. */
export abstract class PuertoEntradaUsuarioLectura {
  /** GET /api/usuarios/yo */
  abstract obtenerPerfil(dto: { idUsuario: number }): Promise<UsuarioPublico>;
  /** RF-04 y RNF-07: convierte un token en el usuario que hace la petición. */
  abstract autenticarSolicitud(dto: { token: SinValidar }): Promise<UsuarioPublico>;
}
