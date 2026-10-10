import {
  Accion,
  Asignacion,
  Deteccion,
  EntradaBitacora,
  Estadisticas,
  EstadisticasGenerales,
  FiltroHistorial,
  Gesto,
  NuevaDeteccion,
  Paginado,
  ResultadoLogin,
  SesionReconocimiento,
  Usuario,
} from '../dominio/modelos';

/*
 * Puerto ApiGestoWeb (SRS §7.4): todo lo que el frontend necesita del backend.
 *
 * Principio de segregación de interfaces (la "I" de SOLID): en vez de una
 * sola lista enorme de métodos, el contrato se divide en interfaces pequeñas.
 * Cada parte del frontend depende solo de la que usa; por ejemplo, el motor
 * de reconocimiento conoce ApiReconocimiento y nada más.
 */

export interface ApiAutenticacion {
  iniciarSesion(correo: string, contrasena: string): Promise<ResultadoLogin>;
  registrarse(datos: { nombre: string; correo: string; contrasena: string }): Promise<Usuario>;
  perfil(): Promise<Usuario>;
  editarPerfil(datos: { nombre?: string; contrasenaActual?: string; contrasenaNueva?: string }): Promise<Usuario>;
}

export interface ApiConfiguracion {
  gestos(): Promise<Gesto[]>;
  acciones(): Promise<Accion[]>;
  asignaciones(): Promise<Asignacion[]>;
  cambiarAsignacion(idGesto: number, idAccion: number): Promise<Asignacion>;
  restaurarAsignaciones(): Promise<Asignacion[]>;
}

export interface ApiReconocimiento {
  asignaciones(): Promise<Asignacion[]>;
  abrirSesion(navegador: string): Promise<SesionReconocimiento>;
  cerrarSesion(idSesion: number): Promise<SesionReconocimiento>;
  registrarDeteccion(idSesion: number, deteccion: NuevaDeteccion): Promise<Deteccion>;
}

export interface ApiHistorial {
  historial(filtro: FiltroHistorial): Promise<Paginado<Deteccion>>;
  descargarCsv(filtro: FiltroHistorial): Promise<{ nombreArchivo: string; contenido: Blob }>;
  estadisticas(filtro: { desde?: string; hasta?: string }): Promise<Estadisticas>;
}

export interface ApiAdministracion {
  gestosAdmin(): Promise<Gesto[]>;
  editarGesto(id: number, cambios: Partial<Pick<Gesto, 'nombre' | 'descripcion' | 'umbralConfianza' | 'activo'>>): Promise<Gesto>;
  accionesAdmin(): Promise<Accion[]>;
  crearAccion(datos: { codigo: string; nombre: string; descripcion?: string }): Promise<Accion>;
  editarAccion(id: number, cambios: Partial<Pick<Accion, 'nombre' | 'descripcion' | 'activa'>>): Promise<Accion>;
  desactivarAccion(id: number): Promise<Accion>;
  usuarios(): Promise<Usuario[]>;
  cambiarUsuario(id: number, cambios: { rol?: string; activo?: boolean }): Promise<Usuario>;
  estadisticasGenerales(filtro: { desde?: string }): Promise<EstadisticasGenerales>;
  bitacora(pagina: number, limite: number): Promise<Paginado<EntradaBitacora>>;
}

/** El puerto completo, usado como token de inyección en Angular. */
export abstract class ApiGestoWeb
  implements ApiAutenticacion, ApiConfiguracion, ApiReconocimiento, ApiHistorial, ApiAdministracion
{
  abstract iniciarSesion(correo: string, contrasena: string): Promise<ResultadoLogin>;
  abstract registrarse(datos: { nombre: string; correo: string; contrasena: string }): Promise<Usuario>;
  abstract perfil(): Promise<Usuario>;
  abstract editarPerfil(datos: { nombre?: string; contrasenaActual?: string; contrasenaNueva?: string }): Promise<Usuario>;

  abstract gestos(): Promise<Gesto[]>;
  abstract acciones(): Promise<Accion[]>;
  abstract asignaciones(): Promise<Asignacion[]>;
  abstract cambiarAsignacion(idGesto: number, idAccion: number): Promise<Asignacion>;
  abstract restaurarAsignaciones(): Promise<Asignacion[]>;

  abstract abrirSesion(navegador: string): Promise<SesionReconocimiento>;
  abstract cerrarSesion(idSesion: number): Promise<SesionReconocimiento>;
  abstract registrarDeteccion(idSesion: number, deteccion: NuevaDeteccion): Promise<Deteccion>;

  abstract historial(filtro: FiltroHistorial): Promise<Paginado<Deteccion>>;
  abstract descargarCsv(filtro: FiltroHistorial): Promise<{ nombreArchivo: string; contenido: Blob }>;
  abstract estadisticas(filtro: { desde?: string; hasta?: string }): Promise<Estadisticas>;

  abstract gestosAdmin(): Promise<Gesto[]>;
  abstract editarGesto(id: number, cambios: Partial<Pick<Gesto, 'nombre' | 'descripcion' | 'umbralConfianza' | 'activo'>>): Promise<Gesto>;
  abstract accionesAdmin(): Promise<Accion[]>;
  abstract crearAccion(datos: { codigo: string; nombre: string; descripcion?: string }): Promise<Accion>;
  abstract editarAccion(id: number, cambios: Partial<Pick<Accion, 'nombre' | 'descripcion' | 'activa'>>): Promise<Accion>;
  abstract desactivarAccion(id: number): Promise<Accion>;
  abstract usuarios(): Promise<Usuario[]>;
  abstract cambiarUsuario(id: number, cambios: { rol?: string; activo?: boolean }): Promise<Usuario>;
  abstract estadisticasGenerales(filtro: { desde?: string }): Promise<EstadisticasGenerales>;
  abstract bitacora(pagina: number, limite: number): Promise<Paginado<EntradaBitacora>>;
}
