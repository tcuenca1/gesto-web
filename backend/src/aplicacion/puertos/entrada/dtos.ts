/**
 * DTO = "objeto de transferencia de datos": la forma en que los casos de uso
 * entregan resultados hacia afuera. Son datos planos, sin métodos, para que
 * ningún adaptador pueda saltarse las reglas de las entidades.
 */
export interface GestoDTO {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  umbralConfianza: number;
  idAccionPredeterminada: number;
  activo: boolean;
}

export interface AccionDTO {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
}

export interface AsignacionDTO {
  gesto: GestoDTO;
  accion: AccionDTO | null;
  esPredeterminada: boolean;
}

export interface SesionDTO {
  id: number;
  fechaInicio: Date;
  fechaFin: Date | null;
  navegador: string | null;
  totalDetecciones: number;
}

export interface DeteccionDTO {
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
