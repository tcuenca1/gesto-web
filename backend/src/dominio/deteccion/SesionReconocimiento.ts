import { ErrorConflicto, ErrorNoEncontrado } from '../compartido/errores';

export interface DatosSesion {
  id: number;
  idUsuario: number;
  fechaInicio: Date;
  fechaFin: Date | null;
  navegador: string | null;
  totalDetecciones: number;
}

/**
 * Sesión de reconocimiento: el tiempo entre encender y apagar la cámara.
 */
export class SesionReconocimiento {
  private constructor(private datos: DatosSesion) {}

  static reconstruir(datos: DatosSesion): SesionReconocimiento {
    return new SesionReconocimiento({ ...datos });
  }

  /** Limpia el texto del navegador (opcional, máx. 100 caracteres). */
  static normalizarNavegador(navegador: unknown): string | null {
    if (typeof navegador !== 'string' || navegador.trim() === '') return null;
    return navegador.trim().slice(0, 100);
  }

  get id(): number { return this.datos.id; }
  get idUsuario(): number { return this.datos.idUsuario; }
  get fechaInicio(): Date { return this.datos.fechaInicio; }
  get fechaFin(): Date | null { return this.datos.fechaFin; }
  get navegador(): string | null { return this.datos.navegador; }
  get totalDetecciones(): number { return this.datos.totalDetecciones; }

  estaAbierta(): boolean {
    return this.datos.fechaFin === null;
  }

  perteneceA(idUsuario: number): boolean {
    return this.datos.idUsuario === idUsuario;
  }

  /**
   * Una persona solo puede usar sus propias sesiones. Si la sesión es de
   * otro usuario respondemos "no encontrada" para no revelar que existe.
   */
  asegurarDueno(idUsuario: number): void {
    if (!this.perteneceA(idUsuario)) {
      throw new ErrorNoEncontrado('La sesión de reconocimiento no existe');
    }
  }

  /** Regla del trigger trg_validar_sesion_abierta, también en el núcleo. */
  asegurarQueRecibeDetecciones(idUsuario: number): void {
    this.asegurarDueno(idUsuario);
    if (!this.estaAbierta()) {
      throw new ErrorConflicto('La sesión de reconocimiento ya está cerrada', 'SESION_CERRADA');
    }
  }

  cerrar(ahora: Date): void {
    if (!this.estaAbierta()) return; // cerrar dos veces no es un error
    this.datos.fechaFin = ahora < this.datos.fechaInicio ? this.datos.fechaInicio : ahora;
  }

  aDatos(): DatosSesion {
    return { ...this.datos };
  }
}
