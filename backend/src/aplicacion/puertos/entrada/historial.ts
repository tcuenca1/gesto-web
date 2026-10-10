import { ResumenEstadisticas } from '../../../dominio/deteccion/Estadisticas';
import { CasoDeUso, Paginado, SinValidar } from './CasoDeUso';
import { DeteccionDTO } from './dtos';

export interface EntradaHistorial {
  idUsuario: number;
  desde?: SinValidar;
  hasta?: SinValidar;
  /** Código del gesto, por ejemplo Thumb_Up. */
  gesto?: SinValidar;
  pagina?: SinValidar;
  limite?: SinValidar;
}

export interface EntradaEstadisticas {
  idUsuario: number;
  desde?: SinValidar;
  hasta?: SinValidar;
  zonaHoraria?: SinValidar;
}

export interface ArchivoCsv {
  nombreArchivo: string;
  contenido: string;
}

/** RF-15 */
export type ConsultarHistorialPuerto = CasoDeUso<EntradaHistorial, Paginado<DeteccionDTO>>;
/** RF-16 */
export type ConsultarEstadisticasPuerto = CasoDeUso<EntradaEstadisticas, ResumenEstadisticas>;
/** RF-17 */
export type ExportarHistorialPuerto = CasoDeUso<
  Omit<EntradaHistorial, 'pagina' | 'limite'> & { zonaHoraria?: SinValidar },
  ArchivoCsv
>;
