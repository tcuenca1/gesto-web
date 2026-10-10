import { Rol } from '../../../dominio/usuario/Usuario';

/** Puerto de salida: cifrar y comparar contraseñas (adaptador: bcrypt). */
export interface CifradorContrasenas {
  cifrar(contrasena: string): Promise<string>;
  comparar(contrasena: string, hash: string): Promise<boolean>;
}

export interface DatosToken {
  idUsuario: number;
  rol: Rol;
}

/** Puerto de salida: crear y validar tokens de sesión (adaptador: JWT). */
export interface GeneradorTokens {
  generar(datos: DatosToken): { token: string; expiraEn: Date };
  /** Lanza ErrorNoAutenticado si el token es inválido o venció. */
  verificar(token: string): DatosToken;
}

/**
 * Puerto de salida: la hora actual. Parece exagerado, pero permite probar
 * reglas que dependen del tiempo con un reloj falso.
 */
export interface Reloj {
  ahora(): Date;
}
