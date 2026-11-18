import { Rol } from '../../../dominio/usuario/Usuario';

export interface DatosToken {
  idUsuario: number;
  rol: Rol;
  /** Versión de tokens del usuario cuando se emitió (usuarios.version_token). */
  version: number;
}

/** Puerto de salida: crear y validar tokens de sesión (adaptador: JWT). */
export abstract class PuertoSalidaTokens {
  abstract generar(datos: DatosToken): { token: string; expiraEn: Date };
  /** Lanza ErrorNoAutenticado si el token es inválido o venció. */
  abstract verificar(token: string): DatosToken;
}
