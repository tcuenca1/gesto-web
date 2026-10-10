/**
 * Formas de los datos que intercambia el frontend con el backend
 * (contrato de la API, SRS §8.2). Las fechas llegan como texto ISO.
 */
export type Rol = 'USUARIO' | 'ADMIN';

export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
  activo: boolean;
  fechaRegistro: string;
  ultimoAcceso: string | null;
}

export interface ResultadoLogin {
  token: string;
  expiraEn: string;
  usuario: Usuario;
}

export interface Gesto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  umbralConfianza: number;
  idAccionPredeterminada: number;
  activo: boolean;
}

export interface Accion {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
}

export interface Asignacion {
  gesto: Gesto;
  accion: Accion | null;
  esPredeterminada: boolean;
}

export interface SesionReconocimiento {
  id: number;
  fechaInicio: string;
  fechaFin: string | null;
  navegador: string | null;
  totalDetecciones: number;
}

export interface NuevaDeteccion {
  codigoGesto: string;
  confianza: number;
  mano: string;
  /** Hora en que el navegador aceptó el gesto (sirve para reintentos). */
  fechaHora: string;
}

export interface Deteccion {
  id: number;
  idSesion: number;
  codigoGesto: string;
  nombreGesto: string;
  codigoAccion: string | null;
  nombreAccion: string | null;
  confianza: number;
  mano: string;
  fechaHora: string;
}

export interface Paginado<T> {
  elementos: T[];
  total: number;
  pagina: number;
  limite: number;
}

export interface FiltroHistorial {
  desde?: string;
  hasta?: string;
  gesto?: string;
  pagina?: number;
  limite?: number;
}

export interface TotalPorGesto {
  idGesto: number;
  codigo: string;
  nombre: string;
  total: number;
  confianzaPromedio: number;
}

export interface UsoPorDia {
  dia: string;
  total: number;
}

export interface Estadisticas {
  totalDetecciones: number;
  gestoMasUsado: TotalPorGesto | null;
  confianzaPromedio: number;
  totalesPorGesto: TotalPorGesto[];
  usoPorDia: UsoPorDia[];
}

export interface EstadisticasGenerales {
  totalUsuarios: number;
  totalSesiones: number;
  totalDetecciones: number;
  usoPorGesto: Array<TotalPorGesto & { activo: boolean; usuariosDistintos: number }>;
  usoPorDia: UsoPorDia[];
  resumen: { gestoMasUsado: TotalPorGesto | null; confianzaPromedio: number };
}

export interface EntradaBitacora {
  id: number;
  idUsuario: number;
  nombreUsuario: string;
  tablaAfectada: string;
  operacion: 'INSERT' | 'UPDATE' | 'DELETE';
  detalle: { antes?: Record<string, unknown>; despues?: Record<string, unknown> } | null;
  fechaHora: string;
}

/** Error de la API con un mensaje listo para mostrar. */
export class ErrorApi extends Error {
  constructor(
    /** Código HTTP; 0 si no hubo conexión con el servidor. */
    public readonly estado: number,
    mensaje: string,
    /** Código de error del backend, por ejemplo VALIDACION o SESION_CERRADA. */
    public readonly codigo: string = '',
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }

  /** ¿Vale la pena reintentar? (servidor caído, sin red, saturado) */
  get reintentable(): boolean {
    return this.estado === 0 || this.estado === 408 || this.estado === 429 || this.estado >= 500;
  }
}
