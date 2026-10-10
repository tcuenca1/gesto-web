import { CasosDeUso } from '../puertos/entrada';
import { AccionRepositorio } from '../puertos/salida/AccionRepositorio';
import { AsignacionRepositorio } from '../puertos/salida/AsignacionRepositorio';
import { BitacoraRepositorio } from '../puertos/salida/BitacoraRepositorio';
import { DeteccionRepositorio } from '../puertos/salida/DeteccionRepositorio';
import { GestoRepositorio } from '../puertos/salida/GestoRepositorio';
import { SesionRepositorio } from '../puertos/salida/SesionRepositorio';
import { CifradorContrasenas, GeneradorTokens, Reloj } from '../puertos/salida/servicios';
import { UnidadDeTrabajo } from '../puertos/salida/UnidadDeTrabajo';
import { UsuarioRepositorio } from '../puertos/salida/UsuarioRepositorio';
import { CambiarAsignacion } from './acciones/CambiarAsignacion';
import { ListarAcciones, ListarGestos } from './acciones/ListarCatalogos';
import { ObtenerAsignaciones } from './acciones/ObtenerAsignaciones';
import { RestaurarAsignaciones } from './acciones/RestaurarAsignaciones';
import { ConsultarBitacora, ConsultarEstadisticasGenerales } from './administracion/ConsultasAdministracion';
import { EditarGesto } from './administracion/EditarGesto';
import { GestionarAcciones } from './administracion/GestionarAcciones';
import { GestionarUsuarios, ListarUsuarios } from './administracion/GestionarUsuarios';
import { ConsultarEstadisticas } from './historial/ConsultarEstadisticas';
import { ConsultarHistorial } from './historial/ConsultarHistorial';
import { ExportarHistorial } from './historial/ExportarHistorial';
import { AbrirSesionReconocimiento } from './reconocimiento/AbrirSesionReconocimiento';
import { CerrarSesionReconocimiento } from './reconocimiento/CerrarSesionReconocimiento';
import { RegistrarDeteccion } from './reconocimiento/RegistrarDeteccion';
import { AutenticarSolicitud } from './usuarios/AutenticarSolicitud';
import { EditarPerfil } from './usuarios/EditarPerfil';
import { IniciarSesion } from './usuarios/IniciarSesion';
import { ObtenerPerfil } from './usuarios/ObtenerPerfil';
import { RegistrarUsuario } from './usuarios/RegistrarUsuario';

/** Todo lo que el núcleo necesita del exterior: solo puertos, ningún adaptador concreto. */
export interface PuertosDeSalida {
  usuarios: UsuarioRepositorio;
  gestos: GestoRepositorio;
  acciones: AccionRepositorio;
  asignaciones: AsignacionRepositorio;
  sesiones: SesionRepositorio;
  detecciones: DeteccionRepositorio;
  bitacora: BitacoraRepositorio;
  unidadDeTrabajo: UnidadDeTrabajo;
  cifrador: CifradorContrasenas;
  tokens: GeneradorTokens;
  reloj: Reloj;
  /** Zona horaria por defecto para agrupar por día, por ejemplo America/Guayaquil. */
  zonaHoraria: string;
}

/**
 * Arma los casos de uso a partir de los puertos (inyección de dependencias
 * por constructor). No sabe si los puertos son PostgreSQL o memoria: eso lo
 * decide main.ts.
 */
export function crearCasosDeUso(p: PuertosDeSalida): CasosDeUso {
  const obtenerAsignaciones = new ObtenerAsignaciones(p.gestos, p.acciones, p.asignaciones);
  return {
    usuarios: {
      registrar: new RegistrarUsuario(p.usuarios, p.cifrador),
      iniciarSesion: new IniciarSesion(p.usuarios, p.cifrador, p.tokens, p.reloj),
      editarPerfil: new EditarPerfil(p.usuarios, p.cifrador),
      obtenerPerfil: new ObtenerPerfil(p.usuarios),
      autenticar: new AutenticarSolicitud(p.tokens, p.usuarios),
    },
    reconocimiento: {
      abrirSesion: new AbrirSesionReconocimiento(p.sesiones),
      registrarDeteccion: new RegistrarDeteccion(p.sesiones, p.gestos, p.acciones, p.asignaciones, p.detecciones, p.reloj),
      cerrarSesion: new CerrarSesionReconocimiento(p.sesiones, p.reloj),
    },
    acciones: {
      listarGestos: new ListarGestos(p.gestos),
      listarAcciones: new ListarAcciones(p.acciones),
      obtenerAsignaciones,
      cambiarAsignacion: new CambiarAsignacion(p.gestos, p.acciones, p.asignaciones),
      restaurarAsignaciones: new RestaurarAsignaciones(p.asignaciones, obtenerAsignaciones),
    },
    historial: {
      consultar: new ConsultarHistorial(p.gestos, p.detecciones),
      estadisticas: new ConsultarEstadisticas(p.detecciones, p.zonaHoraria),
      exportar: new ExportarHistorial(p.gestos, p.detecciones, p.reloj, p.zonaHoraria),
    },
    administracion: {
      editarGesto: new EditarGesto(p.unidadDeTrabajo),
      gestionarAcciones: new GestionarAcciones(p.unidadDeTrabajo),
      listarUsuarios: new ListarUsuarios(p.usuarios),
      gestionarUsuarios: new GestionarUsuarios(p.unidadDeTrabajo),
      estadisticasGenerales: new ConsultarEstadisticasGenerales(p.usuarios, p.sesiones, p.detecciones, p.zonaHoraria),
      consultarBitacora: new ConsultarBitacora(p.bitacora),
    },
  };
}
