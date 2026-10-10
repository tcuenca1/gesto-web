/**
 * Errores del dominio.
 *
 * El núcleo no sabe nada de HTTP: lanza errores con un "tipo" y es el
 * adaptador web (manejador de errores de Express) quien decide qué código
 * HTTP corresponde a cada tipo. Así el dominio no depende de Express.
 */
export type TipoError =
  | 'VALIDACION'      // datos de entrada incorrectos
  | 'NO_AUTENTICADO'  // falta token o credenciales incorrectas
  | 'PROHIBIDO'       // autenticado, pero sin permiso
  | 'NO_ENCONTRADO'   // el recurso no existe
  | 'CONFLICTO';      // choca con el estado actual (correo repetido, sesión cerrada…)

export class ErrorDominio extends Error {
  constructor(
    public readonly tipo: TipoError,
    mensaje: string,
    /** Código más específico opcional, por ejemplo SESION_CERRADA. */
    public readonly codigo?: string,
  ) {
    super(mensaje);
    this.name = 'ErrorDominio';
  }
}

export class ErrorValidacion extends ErrorDominio {
  constructor(mensaje: string) {
    super('VALIDACION', mensaje);
  }
}

export class ErrorNoAutenticado extends ErrorDominio {
  constructor(mensaje = 'Debes iniciar sesión') {
    super('NO_AUTENTICADO', mensaje);
  }
}

export class ErrorProhibido extends ErrorDominio {
  constructor(mensaje = 'No tienes permiso para hacer esto') {
    super('PROHIBIDO', mensaje);
  }
}

export class ErrorNoEncontrado extends ErrorDominio {
  constructor(mensaje: string) {
    super('NO_ENCONTRADO', mensaje);
  }
}

export class ErrorConflicto extends ErrorDominio {
  constructor(mensaje: string, codigo?: string) {
    super('CONFLICTO', mensaje, codigo);
  }
}
