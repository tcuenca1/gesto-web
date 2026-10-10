import { ErrorValidacion } from '../compartido/errores';

/** Los 7 gestos que trae entrenados MediaPipe Gesture Recognizer (SRS §3). */
export const CODIGOS_GESTO = [
  'Open_Palm',
  'Closed_Fist',
  'Pointing_Up',
  'Victory',
  'Thumb_Up',
  'Thumb_Down',
  'ILoveYou',
] as const;
export type CodigoGesto = (typeof CODIGOS_GESTO)[number];

export const UMBRAL_PREDETERMINADO = 0.7;

export interface DatosGesto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  umbralConfianza: number;
  idAccionPredeterminada: number;
  activo: boolean;
}

export interface CambiosGesto {
  nombre?: unknown;
  descripcion?: unknown;
  umbralConfianza?: unknown;
  activo?: unknown;
}

/**
 * Entidad Gesto. Su regla principal: decidir si una confianza alcanza
 * el umbral mínimo para aceptarse (SRS §3.1).
 */
export class Gesto {
  private constructor(private datos: DatosGesto) {}

  static reconstruir(datos: DatosGesto): Gesto {
    return new Gesto({ ...datos });
  }

  /** El umbral va de 0 a 1 y se guarda con dos decimales (NUMERIC(3,2)). */
  static validarUmbral(umbral: unknown): number {
    const valor = typeof umbral === 'string' ? Number(umbral) : umbral;
    if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0 || valor > 1) {
      throw new ErrorValidacion('La confianza mínima debe ser un número entre 0 y 1');
    }
    return Math.round(valor * 100) / 100;
  }

  get id(): number { return this.datos.id; }
  get codigo(): string { return this.datos.codigo; }
  get nombre(): string { return this.datos.nombre; }
  get descripcion(): string | null { return this.datos.descripcion; }
  get umbralConfianza(): number { return this.datos.umbralConfianza; }
  get idAccionPredeterminada(): number { return this.datos.idAccionPredeterminada; }
  get activo(): boolean { return this.datos.activo; }

  /** ¿Esta confianza alcanza el umbral del gesto? */
  aceptaConfianza(confianza: number): boolean {
    return confianza >= this.datos.umbralConfianza;
  }

  /** Cambios que puede hacer el administrador (RF-18). */
  editar(cambios: CambiosGesto): void {
    if (cambios.nombre !== undefined) {
      if (typeof cambios.nombre !== 'string' || cambios.nombre.trim() === '') {
        throw new ErrorValidacion('El nombre del gesto es obligatorio');
      }
      if (cambios.nombre.trim().length > 50) throw new ErrorValidacion('El nombre admite como máximo 50 caracteres');
      this.datos.nombre = cambios.nombre.trim();
    }
    if (cambios.descripcion !== undefined) {
      if (cambios.descripcion !== null && typeof cambios.descripcion !== 'string') {
        throw new ErrorValidacion('La descripción debe ser texto');
      }
      const texto = cambios.descripcion?.trim() ?? '';
      if (texto.length > 200) throw new ErrorValidacion('La descripción admite como máximo 200 caracteres');
      this.datos.descripcion = texto === '' ? null : texto;
    }
    if (cambios.umbralConfianza !== undefined) {
      this.datos.umbralConfianza = Gesto.validarUmbral(cambios.umbralConfianza);
    }
    if (cambios.activo !== undefined) {
      if (typeof cambios.activo !== 'boolean') throw new ErrorValidacion('"activo" debe ser verdadero o falso');
      this.datos.activo = cambios.activo;
    }
  }

  aDatos(): DatosGesto {
    return { ...this.datos };
  }
}
