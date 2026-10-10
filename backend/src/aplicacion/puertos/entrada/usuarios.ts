import { UsuarioPublico } from '../../../dominio/usuario/Usuario';
import { CasoDeUso, SinValidar } from './CasoDeUso';

export interface EntradaRegistro {
  nombre: SinValidar;
  correo: SinValidar;
  contrasena: SinValidar;
}

export interface EntradaInicioSesion {
  correo: SinValidar;
  contrasena: SinValidar;
}

export interface ResultadoInicioSesion {
  token: string;
  expiraEn: Date;
  usuario: UsuarioPublico;
}

export interface EntradaEditarPerfil {
  idUsuario: number;
  nombre?: SinValidar;
  /** Para cambiar la contraseña hay que confirmar la actual. */
  contrasenaActual?: SinValidar;
  contrasenaNueva?: SinValidar;
}

/** RF-01 */
export type RegistrarUsuarioPuerto = CasoDeUso<EntradaRegistro, UsuarioPublico>;
/** RF-02 */
export type IniciarSesionPuerto = CasoDeUso<EntradaInicioSesion, ResultadoInicioSesion>;
/** RF-05 */
export type EditarPerfilPuerto = CasoDeUso<EntradaEditarPerfil, UsuarioPublico>;
/** GET /api/usuarios/yo */
export type ObtenerPerfilPuerto = CasoDeUso<{ idUsuario: number }, UsuarioPublico>;
/** RF-04 y RNF-07: convierte un token en el usuario que hace la petición. */
export type AutenticarSolicitudPuerto = CasoDeUso<{ token: SinValidar }, UsuarioPublico>;
