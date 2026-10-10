import { Deteccion, NuevaDeteccion } from '../../../dominio/deteccion/Deteccion';
import { EntradaHistorial, RangoFechas, TotalPorGesto, UsoPorDia } from '../../../dominio/deteccion/Estadisticas';

export interface FiltroHistorial extends RangoFechas {
  idUsuario: number;
  idGesto?: number;
  pagina: number;  // empieza en 1
  limite: number;
}

export interface PaginaHistorial {
  elementos: EntradaHistorial[];
  total: number;
}

export interface UsoGeneralPorGesto extends TotalPorGesto {
  activo: boolean;
  usuariosDistintos: number;
}

/** Puerto de salida: guardar detecciones y calcular estadísticas. */
export interface DeteccionRepositorio {
  guardar(nueva: NuevaDeteccion): Promise<Deteccion>;
  historial(filtro: FiltroHistorial): Promise<PaginaHistorial>;
  /** Total y confianza promedio por gesto. idUsuario null = todo el sistema. */
  totalesPorGesto(idUsuario: number | null, rango: RangoFechas): Promise<TotalPorGesto[]>;
  usoPorDia(idUsuario: number | null, rango: RangoFechas, zonaHoraria: string): Promise<UsoPorDia[]>;
  /** Vista v_estadisticas_generales. */
  usoGeneral(): Promise<UsoGeneralPorGesto[]>;
  contar(): Promise<number>;
}
