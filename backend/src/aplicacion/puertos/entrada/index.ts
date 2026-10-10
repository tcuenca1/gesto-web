import {
  ConsultarBitacoraPuerto,
  ConsultarEstadisticasGeneralesPuerto,
  EditarGestoPuerto,
  GestionarAccionesPuerto,
  GestionarUsuariosPuerto,
  ListarUsuariosPuerto,
} from './administracion';
import {
  CambiarAsignacionPuerto,
  ListarAccionesPuerto,
  ListarGestosPuerto,
  ObtenerAsignacionesPuerto,
  RestaurarAsignacionesPuerto,
} from './acciones';
import { ConsultarEstadisticasPuerto, ConsultarHistorialPuerto, ExportarHistorialPuerto } from './historial';
import {
  AbrirSesionReconocimientoPuerto,
  CerrarSesionReconocimientoPuerto,
  RegistrarDeteccionPuerto,
} from './reconocimiento';
import {
  AutenticarSolicitudPuerto,
  EditarPerfilPuerto,
  IniciarSesionPuerto,
  ObtenerPerfilPuerto,
  RegistrarUsuarioPuerto,
} from './usuarios';

/**
 * Todos los puertos de entrada del hexágono, agrupados como en la SRS §7.2.
 * El adaptador web recibe este objeto: conoce QUÉ puede pedir, no CÓMO se hace.
 */
export interface CasosDeUso {
  usuarios: {
    registrar: RegistrarUsuarioPuerto;
    iniciarSesion: IniciarSesionPuerto;
    editarPerfil: EditarPerfilPuerto;
    obtenerPerfil: ObtenerPerfilPuerto;
    autenticar: AutenticarSolicitudPuerto;
  };
  reconocimiento: {
    abrirSesion: AbrirSesionReconocimientoPuerto;
    registrarDeteccion: RegistrarDeteccionPuerto;
    cerrarSesion: CerrarSesionReconocimientoPuerto;
  };
  acciones: {
    listarGestos: ListarGestosPuerto;
    listarAcciones: ListarAccionesPuerto;
    obtenerAsignaciones: ObtenerAsignacionesPuerto;
    cambiarAsignacion: CambiarAsignacionPuerto;
    restaurarAsignaciones: RestaurarAsignacionesPuerto;
  };
  historial: {
    consultar: ConsultarHistorialPuerto;
    estadisticas: ConsultarEstadisticasPuerto;
    exportar: ExportarHistorialPuerto;
  };
  administracion: {
    editarGesto: EditarGestoPuerto;
    gestionarAcciones: GestionarAccionesPuerto;
    listarUsuarios: ListarUsuariosPuerto;
    gestionarUsuarios: GestionarUsuariosPuerto;
    estadisticasGenerales: ConsultarEstadisticasGeneralesPuerto;
    consultarBitacora: ConsultarBitacoraPuerto;
  };
}

export * from './CasoDeUso';
export * from './dtos';
export * from './usuarios';
export * from './reconocimiento';
export * from './acciones';
export * from './historial';
export * from './administracion';
