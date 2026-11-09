import { SinValidar } from './DtoComun';

export interface DtoGesto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  umbralConfianza: number;
  idAccionPredeterminada: number;
  activo: boolean;
}

export interface DtoAccion {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
}

export interface DtoAsignacion {
  gesto: DtoGesto;
  accion: DtoAccion | null;
  esPredeterminada: boolean;
}

export interface DtoCambiarAsignacion {
  idUsuario: number;
  idGesto: number;
  idAccion: SinValidar;
}
