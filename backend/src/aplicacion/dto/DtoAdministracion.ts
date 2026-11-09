import { ResumenEstadisticas, UsoPorDia } from '../../dominio/deteccion/Estadisticas';
import { UsoGeneralPorGesto } from '../puerto/salida/PuertoSalidaDeteccion';
import { SinValidar } from './DtoComun';

/** Todo caso de uso de administración sabe QUIÉN hace el cambio (para la bitácora). */
export interface DtoConAdministrador {
  idAdministrador: number;
}

export interface DtoEditarGesto extends DtoConAdministrador {
  idGesto: SinValidar;
  cambios: { nombre?: SinValidar; descripcion?: SinValidar; umbralConfianza?: SinValidar; activo?: SinValidar };
}

export type DtoOperacionAccion =
  | { tipo: 'crear'; datos: { codigo?: SinValidar; nombre?: SinValidar; descripcion?: SinValidar } }
  | { tipo: 'editar'; idAccion: SinValidar; datos: { nombre?: SinValidar; descripcion?: SinValidar; activa?: SinValidar } }
  | { tipo: 'desactivar'; idAccion: SinValidar };

export interface DtoGestionarUsuario extends DtoConAdministrador {
  idUsuario: SinValidar;
  cambios: { rol?: SinValidar; activo?: SinValidar };
}

export interface DtoConsultaEstadisticasGenerales {
  zonaHoraria?: SinValidar;
  desde?: SinValidar;
  hasta?: SinValidar;
}

export interface DtoEstadisticasGenerales {
  totalUsuarios: number;
  totalSesiones: number;
  totalDetecciones: number;
  usoPorGesto: UsoGeneralPorGesto[];
  usoPorDia: UsoPorDia[];
  resumen: Pick<ResumenEstadisticas, 'gestoMasUsado' | 'confianzaPromedio'>;
}
