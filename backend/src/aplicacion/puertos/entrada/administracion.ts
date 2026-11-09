import { UsuarioPublico } from '../../../dominio/usuario/Usuario';
import { EntradaBitacora } from '../../puerto/salida/PuertoSalidaBitacora';
import { DtoAccion, DtoGesto } from '../../dto/DtoAccion';
import {
  DtoConAdministrador,
  DtoConsultaEstadisticasGenerales,
  DtoEditarGesto,
  DtoEstadisticasGenerales,
  DtoGestionarUsuario,
  DtoOperacionAccion,
} from '../../dto/DtoAdministracion';
import { Paginado, SinValidar } from '../../dto/DtoComun';
import { CasoDeUso } from './CasoDeUso';

/** RF-18 */
export type EditarGestoPuerto = CasoDeUso<DtoEditarGesto, DtoGesto>;
/** RF-19 */
export type GestionarAccionesPuerto = CasoDeUso<DtoOperacionAccion & DtoConAdministrador, DtoAccion>;
/** RF-20: ver usuarios */
export type ListarUsuariosPuerto = CasoDeUso<Record<string, never>, UsuarioPublico[]>;
/** RF-20: cambiar rol o estado */
export type GestionarUsuariosPuerto = CasoDeUso<DtoGestionarUsuario, UsuarioPublico>;
/** RF-21 */
export type ConsultarEstadisticasGeneralesPuerto = CasoDeUso<DtoConsultaEstadisticasGenerales, DtoEstadisticasGenerales>;
/** RF-22 (lectura) */
export type ConsultarBitacoraPuerto = CasoDeUso<{ pagina?: SinValidar; limite?: SinValidar }, Paginado<EntradaBitacora>>;
