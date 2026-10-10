import { ErrorValidacion } from '../compartido/errores';

/** Acción especial: el gesto se reconoce pero no hace nada. */
export const CODIGO_ACCION_NINGUNA = 'NINGUNA';

export interface DatosAccion {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
}

export interface NuevaAccion {
  codigo: string;
  nombre: string;
  descripcion: string | null;
}

/**
 * Entidad Acción: lo que ocurre en el panel de demostración cuando se
 * acepta un gesto. El "codigo" (SIGUIENTE, ANTERIOR…) es el idioma común
 * entre backend y frontend.
 */
export class Accion {
  private constructor(private datos: DatosAccion) {}

  static reconstruir(datos: DatosAccion): Accion {
    return new Accion({ ...datos });
  }

  /** Valida los datos de una acción nueva (RF-19). */
  static validarNueva(entrada: { codigo?: unknown; nombre?: unknown; descripcion?: unknown }): NuevaAccion {
    return {
      codigo: Accion.validarCodigo(entrada.codigo),
      nombre: Accion.validarNombre(entrada.nombre),
      descripcion: Accion.validarDescripcion(entrada.descripcion),
    };
  }

  static validarCodigo(codigo: unknown): string {
    if (typeof codigo !== 'string') throw new ErrorValidacion('El código de la acción es obligatorio');
    const limpio = codigo.trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9_]*$/.test(limpio) || limpio.length > 30) {
      throw new ErrorValidacion('El código usa solo MAYÚSCULAS, números y guion bajo (máx. 30), como SIGUIENTE');
    }
    return limpio;
  }

  static validarNombre(nombre: unknown): string {
    if (typeof nombre !== 'string' || nombre.trim() === '') throw new ErrorValidacion('El nombre de la acción es obligatorio');
    if (nombre.trim().length > 60) throw new ErrorValidacion('El nombre admite como máximo 60 caracteres');
    return nombre.trim();
  }

  static validarDescripcion(descripcion: unknown): string | null {
    if (descripcion === undefined || descripcion === null) return null;
    if (typeof descripcion !== 'string') throw new ErrorValidacion('La descripción debe ser texto');
    const texto = descripcion.trim();
    if (texto.length > 200) throw new ErrorValidacion('La descripción admite como máximo 200 caracteres');
    return texto === '' ? null : texto;
  }

  get id(): number { return this.datos.id; }
  get codigo(): string { return this.datos.codigo; }
  get nombre(): string { return this.datos.nombre; }
  get descripcion(): string | null { return this.datos.descripcion; }
  get activa(): boolean { return this.datos.activa; }

  esNinguna(): boolean {
    return this.datos.codigo === CODIGO_ACCION_NINGUNA;
  }

  editar(cambios: { nombre?: unknown; descripcion?: unknown; activa?: unknown }): void {
    if (cambios.nombre !== undefined) this.datos.nombre = Accion.validarNombre(cambios.nombre);
    if (cambios.descripcion !== undefined) this.datos.descripcion = Accion.validarDescripcion(cambios.descripcion);
    if (cambios.activa !== undefined) {
      if (typeof cambios.activa !== 'boolean') throw new ErrorValidacion('"activa" debe ser verdadero o falso');
      this.datos.activa = cambios.activa;
    }
  }

  aDatos(): DatosAccion {
    return { ...this.datos };
  }
}
