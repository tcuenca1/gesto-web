import { Deteccion, NuevaDeteccion } from '../../../dominio/deteccion/Deteccion';
import { EntradaHistorial, RangoFechas, TotalPorGesto, UsoPorDia } from '../../../dominio/deteccion/Estadisticas';

export interface FiltroHistorial extends RangoFechas {
  idUsuario: number;
  idGesto?: number;
  pagina: number; // empieza en 1
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
export abstract class PuertoSalidaDeteccion {
  abstract guardar(nueva: NuevaDeteccion): Promise<Deteccion>;
  abstract historial(filtro: FiltroHistorial): Promise<PaginaHistorial>;
  /** Total y confianza promedio por gesto. idUsuario null = todo el sistema. */
  abstract totalesPorGesto(idUsuario: number | null, rango: RangoFechas): Promise<TotalPorGesto[]>;
  abstract usoPorDia(idUsuario: number | null, rango: RangoFechas, zonaHoraria: string): Promise<UsoPorDia[]>;
  /** Vista v_estadisticas_generales. */
  abstract usoGeneral(): Promise<UsoGeneralPorGesto[]>;
  abstract contar(): Promise<number>;
}
