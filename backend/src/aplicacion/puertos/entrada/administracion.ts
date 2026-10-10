import { UsuarioPublico } from '../../../dominio/usuario/Usuario';
import { ResumenEstadisticas, UsoPorDia } from '../../../dominio/deteccion/Estadisticas';
import { EntradaBitacora } from '../salida/BitacoraRepositorio';
import { UsoGeneralPorGesto } from '../salida/DeteccionRepositorio';
import { CasoDeUso, Paginado, SinValidar } from './CasoDeUso';
import { AccionDTO, GestoDTO } from './dtos';

/** Todo caso de uso de administración sabe QUIÉN hace el cambio (para la bitácora). */
interface ConAdministrador {
  idAdministrador: number;
}

export interface EntradaEditarGesto extends ConAdministrador {
  idGesto: number;
  cambios: { nombre?: SinValidar; descripcion?: SinValidar; umbralConfianza?: SinValidar; activo?: SinValidar };
}

export type OperacionAccion =
  | { tipo: 'crear'; datos: { codigo?: SinValidar; nombre?: SinValidar; descripcion?: SinValidar } }
  | { tipo: 'editar'; idAccion: number; datos: { nombre?: SinValidar; descripcion?: SinValidar; activa?: SinValidar } }
  | { tipo: 'desactivar'; idAccion: number };

export interface EntradaGestionarUsuario extends ConAdministrador {
  idUsuario: number;
  cambios: { rol?: SinValidar; activo?: SinValidar };
}

export interface EstadisticasGenerales {
  totalUsuarios: number;
  totalSesiones: number;
  totalDetecciones: number;
  usoPorGesto: UsoGeneralPorGesto[];
  usoPorDia: UsoPorDia[];
  resumen: Pick<ResumenEstadisticas, 'gestoMasUsado' | 'confianzaPromedio'>;
}

/** RF-18 */
export type EditarGestoPuerto = CasoDeUso<EntradaEditarGesto, GestoDTO>;
/** RF-19 */
export type GestionarAccionesPuerto = CasoDeUso<OperacionAccion & ConAdministrador, AccionDTO>;
/** RF-20: ver usuarios */
export type ListarUsuariosPuerto = CasoDeUso<Record<string, never>, UsuarioPublico[]>;
/** RF-20: cambiar rol o estado */
export type GestionarUsuariosPuerto = CasoDeUso<EntradaGestionarUsuario, UsuarioPublico>;
/** RF-21 */
export type ConsultarEstadisticasGeneralesPuerto = CasoDeUso<{ zonaHoraria?: SinValidar; desde?: SinValidar; hasta?: SinValidar }, EstadisticasGenerales>;
/** RF-22 (lectura) */
export type ConsultarBitacoraPuerto = CasoDeUso<{ pagina?: SinValidar; limite?: SinValidar }, Paginado<EntradaBitacora>>;
