import jwt, { SignOptions } from 'jsonwebtoken';
import { ErrorNoAutenticado } from '../../dominio/compartido/errores';
import { ROLES, Rol } from '../../dominio/usuario/Usuario';
import { DatosToken, GeneradorTokens } from '../../aplicacion/puertos/salida/servicios';

/** Adaptador del puerto GeneradorTokens con JSON Web Tokens (RNF-07: vencen a las 8 horas). */
export class GeneradorTokensJwt implements GeneradorTokens {
  constructor(
    private readonly secreto: string,
    private readonly duracionSegundos = 8 * 60 * 60,
  ) {
    if (secreto.length < 16) throw new Error('El secreto JWT debe tener al menos 16 caracteres');
  }

  generar(datos: DatosToken): { token: string; expiraEn: Date } {
    const opciones: SignOptions = { algorithm: 'HS256', expiresIn: this.duracionSegundos, subject: String(datos.idUsuario) };
    const token = jwt.sign({ rol: datos.rol }, this.secreto, opciones);
    const { exp } = jwt.decode(token) as { exp: number };
    return { token, expiraEn: new Date(exp * 1000) };
  }

  verificar(token: string): DatosToken {
    try {
      const carga = jwt.verify(token, this.secreto, { algorithms: ['HS256'] }) as jwt.JwtPayload;
      const idUsuario = Number(carga.sub);
      if (!Number.isInteger(idUsuario) || !ROLES.includes(carga.rol as Rol)) throw new Error('carga inválida');
      return { idUsuario, rol: carga.rol as Rol };
    } catch (error) {
      const vencido = error instanceof jwt.TokenExpiredError;
      throw new ErrorNoAutenticado(vencido ? 'Tu sesión venció. Inicia sesión de nuevo.' : 'Token inválido');
    }
  }
}
