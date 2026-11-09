import { UsuarioPublico } from '../../../dominio/usuario/Usuario';
import { DtoEditarPerfil, DtoInicioSesion, DtoRegistroUsuario, DtoResultadoInicioSesion } from '../../dto/DtoUsuario';

/** Cambios del módulo Usuario. */
export abstract class PuertoEntradaUsuarioEscritura {
  /** RF-01 */
  abstract registrarUsuario(dto: DtoRegistroUsuario): Promise<UsuarioPublico>;
  /** RF-02 (también registra el último acceso) */
  abstract iniciarSesion(dto: DtoInicioSesion): Promise<DtoResultadoInicioSesion>;
  /** RF-05 */
  abstract editarPerfil(dto: DtoEditarPerfil): Promise<UsuarioPublico>;
}
