import { NextFunction, Request, RequestHandler, Response } from 'express';
import { ErrorDominio, ErrorProhibido, TipoError } from '../../../dominio/compartido/errores';
import { Rol, UsuarioPublico } from '../../../dominio/usuario/Usuario';
import { AutenticarSolicitudPuerto } from '../../../aplicacion/puertos/entrada/usuarios';

/** Express 4 no atrapa errores de funciones async: este envoltorio los pasa al manejador. */
export const manejar =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

/** Usuario autenticado de la petición (lo deja el middleware autenticar). */
export function usuarioDe(res: Response): UsuarioPublico {
  return res.locals.usuario as UsuarioPublico;
}

/**
 * Middleware de token (RNF-07): lee "Authorization: Bearer <token>" y le pide
 * al caso de uso AutenticarSolicitud quién es el usuario.
 */
export function autenticacion(autenticar: AutenticarSolicitudPuerto): RequestHandler {
  return (req, res, next) => {
    const cabecera = req.header('authorization') ?? '';
    const token = cabecera.startsWith('Bearer ') ? cabecera.slice(7).trim() : '';
    autenticar
      .ejecutar({ token })
      .then((usuario) => {
        res.locals.usuario = usuario;
        next();
      })
      .catch(next);
  };
}

/** Middleware de rol (RF-04): solo deja pasar a los roles indicados. */
export function exigirRol(...roles: Rol[]): RequestHandler {
  return (_req, res, next) => {
    const usuario = usuarioDe(res);
    if (!usuario || !roles.includes(usuario.rol)) return next(new ErrorProhibido());
    next();
  };
}

/** Límite simple de intentos por IP (protege login y registro de ataques de fuerza bruta). */
export function limitarIntentos(maximo: number, ventanaMs: number): RequestHandler {
  const intentos = new Map<string, { cuenta: number; reinicio: number }>();
  return (req, res, next) => {
    const ahora = Date.now();
    const clave = req.ip ?? 'desconocida';
    const registro = intentos.get(clave);
    if (!registro || registro.reinicio < ahora) {
      intentos.set(clave, { cuenta: 1, reinicio: ahora + ventanaMs });
      return next();
    }
    registro.cuenta += 1;
    if (registro.cuenta > maximo) {
      res.setHeader('Retry-After', Math.ceil((registro.reinicio - ahora) / 1000));
      return res.status(429).json({ error: { codigo: 'DEMASIADOS_INTENTOS', mensaje: 'Demasiados intentos. Espera unos minutos.' } });
    }
    next();
  };
}

/** Cabeceras de seguridad básicas. */
export const cabecerasSeguridad: RequestHandler = (_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  // La cámara solo la puede usar esta misma página (RNF-01).
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=()');
  next();
};

const ESTADO_HTTP: Record<TipoError, number> = {
  VALIDACION: 400,
  NO_AUTENTICADO: 401,
  PROHIBIDO: 403,
  NO_ENCONTRADO: 404,
  CONFLICTO: 409,
};

/**
 * Traduce los errores del núcleo a respuestas HTTP. Es el único lugar
 * del sistema que sabe que "CONFLICTO" significa 409.
 */
export function manejadorErrores(registrar: (e: unknown) => void = console.error) {
  return (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ErrorDominio) {
      return res
        .status(ESTADO_HTTP[error.tipo])
        .json({ error: { codigo: error.codigo ?? error.tipo, mensaje: error.message } });
    }
    const e = error as { type?: string; status?: number };
    if (e?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: { codigo: 'VALIDACION', mensaje: 'El cuerpo de la petición no es un JSON válido' } });
    }
    if (e?.type === 'entity.too.large') {
      return res.status(413).json({ error: { codigo: 'VALIDACION', mensaje: 'La petición es demasiado grande' } });
    }
    registrar(error);
    return res.status(500).json({ error: { codigo: 'ERROR_INTERNO', mensaje: 'Ocurrió un error inesperado' } });
  };
}
