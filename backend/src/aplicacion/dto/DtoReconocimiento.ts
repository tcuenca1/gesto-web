import { SinValidar } from './DtoComun';

export interface DtoSesion {
  id: number;
  fechaInicio: Date;
  fechaFin: Date | null;
  navegador: string | null;
  totalDetecciones: number;
}

export interface DtoDeteccion {
  id: number;
  idSesion: number;
  codigoGesto: string;
  nombreGesto: string;
  codigoAccion: string | null;
  nombreAccion: string | null;
  confianza: number;
  mano: string;
  fechaHora: Date;
}

export interface DtoAbrirSesion {
  idUsuario: number;
  navegador?: SinValidar;
}

export interface DtoRegistrarDeteccion {
  idUsuario: number;
  idSesion: number;
  codigoGesto: SinValidar;
  confianza: SinValidar;
  mano: SinValidar;
  fechaHora?: SinValidar;
}

export interface DtoCerrarSesion {
  idUsuario: number;
  idSesion: number;
}
