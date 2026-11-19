import { UsuarioPublico } from '../../dominio/usuario/Usuario';
import { SinValidar } from './DtoComun';

export interface DtoRegistroUsuario {
  nombre: SinValidar;
  correo: SinValidar;
  contrasena: SinValidar;
}

export interface DtoInicioSesion {
  correo: SinValidar;
  contrasena: SinValidar;
}

export interface DtoResultadoInicioSesion {
  token: string;
  expiraEn: Date;
  usuario: UsuarioPublico;
}

/** Cerrar la sesión de una cuenta (POST /api/auth/logout). */
export interface DtoCerrarSesionUsuario {
  idUsuario: number;
}

export interface DtoEditarPerfil {
  idUsuario: number;
  nombre?: SinValidar;
  /** Para cambiar la contraseña hay que confirmar la actual. */
  contrasenaActual?: SinValidar;
  contrasenaNueva?: SinValidar;
}
