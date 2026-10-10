import { ErrorValidacion } from '../compartido/errores';

export type Rol = 'USUARIO' | 'ADMIN';
export const ROLES: readonly Rol[] = ['USUARIO', 'ADMIN'];

export interface DatosUsuario {
  id: number;
  nombre: string;
  correo: string;
  contrasenaHash: string;
  rol: Rol;
  activo: boolean;
  fechaRegistro: Date;
  ultimoAcceso: Date | null;
}

/** Datos para crear un usuario nuevo (todavía sin id). */
export interface NuevoUsuario {
  nombre: string;
  correo: string;
  contrasenaHash: string;
  rol: Rol;
}

/** Lo que se puede mostrar de un usuario: nunca incluye el hash. */
export interface UsuarioPublico {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
  activo: boolean;
  fechaRegistro: Date;
  ultimoAcceso: Date | null;
}

const PATRON_CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Entidad Usuario: guarda las reglas sobre nombres, correos, contraseñas
 * y roles. No conoce bcrypt, PostgreSQL ni Express.
 */
export class Usuario {
  private constructor(private datos: DatosUsuario) {}

  /** Reconstruye un usuario que ya existe (por ejemplo, leído de la base). */
  static reconstruir(datos: DatosUsuario): Usuario {
    return new Usuario({ ...datos });
  }

  // ---------- Reglas de validación (sin estado) ----------

  static validarNombre(nombre: unknown): string {
    if (typeof nombre !== 'string' || nombre.trim().length === 0) {
      throw new ErrorValidacion('El nombre es obligatorio');
    }
    const limpio = nombre.trim().replace(/\s+/g, ' ');
    if (limpio.length > 80) throw new ErrorValidacion('El nombre admite como máximo 80 caracteres');
    return limpio;
  }

  static normalizarCorreo(correo: unknown): string {
    if (typeof correo !== 'string') throw new ErrorValidacion('El correo es obligatorio');
    const limpio = correo.trim().toLowerCase();
    if (!PATRON_CORREO.test(limpio)) throw new ErrorValidacion('El correo no tiene un formato válido');
    if (limpio.length > 120) throw new ErrorValidacion('El correo admite como máximo 120 caracteres');
    return limpio;
  }

  /**
   * Contraseña: entre 8 y 72 caracteres (72 es el límite de bcrypt),
   * con al menos una letra y un número.
   */
  static validarContrasena(contrasena: unknown): string {
    if (typeof contrasena !== 'string' || contrasena.length < 8) {
      throw new ErrorValidacion('La contraseña debe tener al menos 8 caracteres');
    }
    if (contrasena.length > 72) throw new ErrorValidacion('La contraseña admite como máximo 72 caracteres');
    if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(contrasena) || !/\d/.test(contrasena)) {
      throw new ErrorValidacion('La contraseña debe tener al menos una letra y un número');
    }
    return contrasena;
  }

  static validarRol(rol: unknown): Rol {
    if (!ROLES.includes(rol as Rol)) throw new ErrorValidacion('El rol debe ser USUARIO o ADMIN');
    return rol as Rol;
  }

  // ---------- Lectura ----------

  get id(): number { return this.datos.id; }
  get nombre(): string { return this.datos.nombre; }
  get correo(): string { return this.datos.correo; }
  get contrasenaHash(): string { return this.datos.contrasenaHash; }
  get rol(): Rol { return this.datos.rol; }
  get activo(): boolean { return this.datos.activo; }
  get fechaRegistro(): Date { return this.datos.fechaRegistro; }
  get ultimoAcceso(): Date | null { return this.datos.ultimoAcceso; }

  esAdmin(): boolean {
    return this.datos.rol === 'ADMIN';
  }

  /** Un usuario inactivo no puede entrar (SRS §9.2, tabla usuarios). */
  puedeIniciarSesion(): boolean {
    return this.datos.activo;
  }

  // ---------- Cambios de estado ----------

  cambiarNombre(nombre: unknown): void {
    this.datos.nombre = Usuario.validarNombre(nombre);
  }

  cambiarContrasenaHash(hash: string): void {
    this.datos.contrasenaHash = hash;
  }

  cambiarRol(rol: unknown): void {
    this.datos.rol = Usuario.validarRol(rol);
  }

  cambiarEstado(activo: boolean): void {
    this.datos.activo = activo;
  }

  registrarAcceso(fecha: Date): void {
    this.datos.ultimoAcceso = fecha;
  }

  aPublico(): UsuarioPublico {
    const { contrasenaHash: _omitido, ...publico } = this.datos;
    return { ...publico };
  }

  aDatos(): DatosUsuario {
    return { ...this.datos };
  }
}
