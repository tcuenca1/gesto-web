import { CODIGO_NINGUNO, Mano, ResultadoReconocimiento } from '../dominio/gesto';

/**
 * Reglas para aceptar un gesto (SRS §3.1, RF-09).
 *
 * TypeScript puro: no conoce Angular, la cámara ni MediaPipe. Recibe
 * resultados y la hora, y responde en qué estado está el reconocimiento.
 * Por eso se prueba con datos falsos (ver reglas-aceptacion.spec.ts).
 */
export interface ConfiguracionReglas {
  /** El mismo gesto debe mantenerse este tiempo seguido. SRS: medio segundo. */
  estabilidadMs: number;
  /** Después de una acción, el mismo gesto no se repite durante este tiempo. SRS: 1 segundo. */
  pausaMs: number;
  /**
   * Tolerancia a parpadeos: si el modelo falla en una o dos imágenes sueltas
   * (por ejemplo, un cuadro borroso), no se reinicia la cuenta de estabilidad.
   */
  toleranciaMs: number;
}

export const REGLAS_SRS: ConfiguracionReglas = { estabilidadMs: 500, pausaMs: 1000, toleranciaMs: 150 };

export type EstadoReconocimiento =
  | { tipo: 'sin-mano' }
  | { tipo: 'buscando'; codigo: string | null; confianza: number }
  | { tipo: 'estabilizando'; codigo: string; confianza: number; progreso: number }
  | { tipo: 'en-pausa'; codigo: string; confianza: number }
  | { tipo: 'aceptado'; codigo: string; confianza: number; mano: Mano };

export class ReglasAceptacion {
  private candidato: string | null = null;
  private desdeMs = 0;
  private ultimaCoincidenciaMs = 0;
  private ultimoAceptado: string | null = null;
  private ultimaAccionMs = Number.NEGATIVE_INFINITY;

  /**
   * @param umbrales confianza mínima de cada gesto activo (código → 0..1).
   *                 Un gesto que no está aquí (desactivado o "None") se ignora.
   */
  constructor(
    private umbrales: ReadonlyMap<string, number>,
    private readonly config: ConfiguracionReglas = REGLAS_SRS,
  ) {}

  actualizarUmbrales(umbrales: ReadonlyMap<string, number>): void {
    this.umbrales = umbrales;
  }

  reiniciar(): void {
    this.candidato = null;
    this.ultimoAceptado = null;
    this.ultimaAccionMs = Number.NEGATIVE_INFINITY;
  }

  /** Evalúa el resultado de una imagen. Se llama varias veces por segundo. */
  evaluar(resultado: ResultadoReconocimiento | null, ahoraMs: number): EstadoReconocimiento {
    const umbral = resultado ? this.umbrales.get(resultado.codigo) : undefined;
    const valido =
      resultado !== null &&
      resultado.codigo !== CODIGO_NINGUNO &&
      umbral !== undefined &&
      resultado.confianza >= umbral;

    if (!valido) {
      // Parpadeo corto: se conserva el candidato.
      if (this.candidato && ahoraMs - this.ultimaCoincidenciaMs <= this.config.toleranciaMs) {
        return this.estabilizando(this.candidato, resultado?.confianza ?? 0, ahoraMs);
      }
      this.candidato = null;
      return resultado
        ? { tipo: 'buscando', codigo: resultado.codigo === CODIGO_NINGUNO ? null : resultado.codigo, confianza: resultado.confianza }
        : { tipo: 'sin-mano' };
    }

    const { codigo, confianza, mano } = resultado;
    this.ultimaCoincidenciaMs = ahoraMs;

    if (codigo !== this.candidato) {
      this.candidato = codigo;
      this.desdeMs = ahoraMs;
    }

    if (ahoraMs - this.desdeMs < this.config.estabilidadMs) {
      return this.estabilizando(codigo, confianza, ahoraMs);
    }

    if (codigo === this.ultimoAceptado && ahoraMs - this.ultimaAccionMs < this.config.pausaMs) {
      return { tipo: 'en-pausa', codigo, confianza };
    }

    // ¡Aceptado! Si la persona mantiene el gesto, se repite cuando termine la pausa;
    // mientras tanto el estado es "en-pausa" (la pantalla muestra que ya se aceptó).
    this.ultimoAceptado = codigo;
    this.ultimaAccionMs = ahoraMs;
    return { tipo: 'aceptado', codigo, confianza, mano };
  }

  private estabilizando(codigo: string, confianza: number, ahoraMs: number): EstadoReconocimiento {
    const progreso = Math.min(1, (ahoraMs - this.desdeMs) / this.config.estabilidadMs);
    return { tipo: 'estabilizando', codigo, confianza, progreso };
  }
}
