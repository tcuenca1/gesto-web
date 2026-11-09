import { SinValidar } from './DtoComun';

export interface DtoConsultaHistorial {
  idUsuario: number;
  desde?: SinValidar;
  hasta?: SinValidar;
  /** Código del gesto, por ejemplo Thumb_Up. */
  gesto?: SinValidar;
  pagina?: SinValidar;
  limite?: SinValidar;
}

export type DtoExportarHistorial = Omit<DtoConsultaHistorial, 'pagina' | 'limite'> & { zonaHoraria?: SinValidar };

export interface DtoConsultaEstadisticas {
  idUsuario: number;
  desde?: SinValidar;
  hasta?: SinValidar;
  zonaHoraria?: SinValidar;
}

export interface DtoArchivoCsv {
  nombreArchivo: string;
  contenido: string;
}
