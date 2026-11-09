import { UsuarioPublico } from '../../../dominio/usuario/Usuario';
import { SinValidar } from '../../dto/DtoComun';
import { DtoEditarPerfil, DtoInicioSesion, DtoRegistroUsuario, DtoResultadoInicioSesion } from '../../dto/DtoUsuario';
import { CasoDeUso } from './CasoDeUso';

/** RF-01 */
export type RegistrarUsuarioPuerto = CasoDeUso<DtoRegistroUsuario, UsuarioPublico>;
/** RF-02 */
export type IniciarSesionPuerto = CasoDeUso<DtoInicioSesion, DtoResultadoInicioSesion>;
/** RF-05 */
export type EditarPerfilPuerto = CasoDeUso<DtoEditarPerfil, UsuarioPublico>;
/** GET /api/usuarios/yo */
export type ObtenerPerfilPuerto = CasoDeUso<{ idUsuario: number }, UsuarioPublico>;
/** RF-04 y RNF-07: convierte un token en el usuario que hace la petición. */
export type AutenticarSolicitudPuerto = CasoDeUso<{ token: SinValidar }, UsuarioPublico>;
