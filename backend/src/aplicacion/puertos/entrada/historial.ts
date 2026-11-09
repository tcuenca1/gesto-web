import { ResumenEstadisticas } from '../../../dominio/deteccion/Estadisticas';
import { Paginado } from '../../dto/DtoComun';
import { DtoArchivoCsv, DtoConsultaEstadisticas, DtoConsultaHistorial, DtoExportarHistorial } from '../../dto/DtoHistorial';
import { DtoDeteccion } from '../../dto/DtoReconocimiento';
import { CasoDeUso } from './CasoDeUso';

/** RF-15 */
export type ConsultarHistorialPuerto = CasoDeUso<DtoConsultaHistorial, Paginado<DtoDeteccion>>;
/** RF-16 */
export type ConsultarEstadisticasPuerto = CasoDeUso<DtoConsultaEstadisticas, ResumenEstadisticas>;
/** RF-17 */
export type ExportarHistorialPuerto = CasoDeUso<DtoExportarHistorial, DtoArchivoCsv>;
