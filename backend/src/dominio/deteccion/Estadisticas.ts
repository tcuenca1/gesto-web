import { ErrorValidacion } from '../compartido/errores';

/** Rango de fechas [desde, hasta). Cualquiera de los dos puede faltar. */
export interface RangoFechas {
  desde?: Date;
  hasta?: Date;
}

export interface TotalPorGesto {
  idGesto: number;
  codigo: string;
  nombre: string;
  total: number;
  confianzaPromedio: number;
}

export interface UsoPorDia {
  /** Día en la zona horaria pedida, formato AAAA-MM-DD. */
  dia: string;
  total: number;
}

export interface ResumenEstadisticas {
  totalDetecciones: number;
  gestoMasUsado: TotalPorGesto | null;
  confianzaPromedio: number;
  totalesPorGesto: TotalPorGesto[];
  usoPorDia: UsoPorDia[];
}

/** Una fila del historial, ya con nombres para mostrar (vista v_historial). */
export interface EntradaHistorial {
  id: number;
  idSesion: number;
  idUsuario: number;
  codigoGesto: string;
  nombreGesto: string;
  codigoAccion: string | null;
  nombreAccion: string | null;
  confianza: number;
  mano: string;
  fechaHora: Date;
}

export function validarRango(rango: RangoFechas): RangoFechas {
  if (rango.desde && rango.hasta && rango.desde >= rango.hasta) {
    throw new ErrorValidacion('La fecha "desde" debe ser anterior a "hasta"');
  }
  return rango;
}

/** Comprueba que la zona horaria exista (por ejemplo America/Guayaquil). */
export function validarZonaHoraria(zona: string): string {
  try {
    new Intl.DateTimeFormat('es', { timeZone: zona });
    return zona;
  } catch {
    throw new ErrorValidacion(`La zona horaria "${zona}" no existe`);
  }
}

/**
 * Regla de negocio: a partir de los totales por gesto y por día calcula el
 * resumen de RF-16 (gesto más usado, total y confianza promedio ponderada).
 * Es pura: no lee la base de datos, por eso se prueba con datos falsos.
 */
export function resumirEstadisticas(totalesPorGesto: TotalPorGesto[], usoPorDia: UsoPorDia[]): ResumenEstadisticas {
  const totalDetecciones = totalesPorGesto.reduce((suma, g) => suma + g.total, 0);
  const sumaConfianza = totalesPorGesto.reduce((suma, g) => suma + g.confianzaPromedio * g.total, 0);
  const gestoMasUsado = totalesPorGesto.reduce<TotalPorGesto | null>(
    (mejor, g) => (g.total > 0 && (!mejor || g.total > mejor.total) ? g : mejor),
    null,
  );
  return {
    totalDetecciones,
    gestoMasUsado,
    confianzaPromedio: totalDetecciones === 0 ? 0 : Math.round((sumaConfianza / totalDetecciones) * 1000) / 1000,
    totalesPorGesto,
    usoPorDia: [...usoPorDia].sort((a, b) => a.dia.localeCompare(b.dia)),
  };
}
