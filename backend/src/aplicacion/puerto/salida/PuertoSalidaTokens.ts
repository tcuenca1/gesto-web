import { Rol } from '../../../dominio/usuario/Usuario';

export interface DatosToken {
  idUsuario: number;
  rol: Rol;
}

/** Puerto de salida: crear y validar tokens de sesión (adaptador: JWT). */
export abstract class PuertoSalidaTokens {
  abstract generar(datos: DatosToken): { token: string; expiraEn: Date };
  /** Lanza ErrorNoAutenticado si el token es inválido o venció. */
  abstract verificar(token: string): DatosToken;
}
