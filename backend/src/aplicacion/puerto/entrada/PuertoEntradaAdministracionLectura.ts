import { UsuarioPublico } from '../../../dominio/usuario/Usuario';
import { DtoConsultaEstadisticasGenerales, DtoEstadisticasGenerales } from '../../dto/DtoAdministracion';
import { Paginado, SinValidar } from '../../dto/DtoComun';
import { EntradaBitacora } from '../salida/PuertoSalidaBitacora';

/** Consultas del administrador. */
export abstract class PuertoEntradaAdministracionLectura {
  /** RF-20: ver usuarios */
  abstract listarUsuarios(): Promise<UsuarioPublico[]>;
  /** RF-21 */
  abstract consultarEstadisticasGenerales(dto: DtoConsultaEstadisticasGenerales): Promise<DtoEstadisticasGenerales>;
  /** RF-22 (lectura) */
  abstract consultarBitacora(dto: { pagina?: SinValidar; limite?: SinValidar }): Promise<Paginado<EntradaBitacora>>;
}
