import { ResumenEstadisticas } from '../../../dominio/deteccion/Estadisticas';
import { Paginado } from '../../dto/DtoComun';
import { DtoArchivoCsv, DtoConsultaEstadisticas, DtoConsultaHistorial, DtoExportarHistorial } from '../../dto/DtoHistorial';
import { DtoDeteccion } from '../../dto/DtoReconocimiento';

/** Historial y estadísticas propias. */
export abstract class PuertoEntradaHistorialLectura {
  /** RF-15 */
  abstract consultarHistorial(dto: DtoConsultaHistorial): Promise<Paginado<DtoDeteccion>>;
  /** RF-16 */
  abstract consultarEstadisticas(dto: DtoConsultaEstadisticas): Promise<ResumenEstadisticas>;
  /** RF-17 */
  abstract exportarHistorial(dto: DtoExportarHistorial): Promise<DtoArchivoCsv>;
}
