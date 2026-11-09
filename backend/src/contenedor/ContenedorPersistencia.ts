import { Pool } from 'pg';
import { PuertoSalidaAccion } from '../aplicacion/puerto/salida/PuertoSalidaAccion';
import { PuertoSalidaAsignacion } from '../aplicacion/puerto/salida/PuertoSalidaAsignacion';
import { PuertoSalidaBitacora } from '../aplicacion/puerto/salida/PuertoSalidaBitacora';
import { PuertoSalidaCifrador } from '../aplicacion/puerto/salida/PuertoSalidaCifrador';
import { PuertoSalidaDeteccion } from '../aplicacion/puerto/salida/PuertoSalidaDeteccion';
import { PuertoSalidaGesto } from '../aplicacion/puerto/salida/PuertoSalidaGesto';
import { PuertoSalidaReloj } from '../aplicacion/puerto/salida/PuertoSalidaReloj';
import { PuertoSalidaSesion } from '../aplicacion/puerto/salida/PuertoSalidaSesion';
import { PuertoSalidaTokens } from '../aplicacion/puerto/salida/PuertoSalidaTokens';
import { PuertoSalidaUnidadDeTrabajo } from '../aplicacion/puerto/salida/PuertoSalidaUnidadDeTrabajo';
import { PuertoSalidaUsuario } from '../aplicacion/puerto/salida/PuertoSalidaUsuario';
import { AdapSalida_AccionMemoria } from '../infraestructura/adaptadores/salida/AdapSalida_AccionMemoria';
import { AdapSalida_AccionPostgres } from '../infraestructura/adaptadores/salida/AdapSalida_AccionPostgres';
import { AdapSalida_AsignacionMemoria } from '../infraestructura/adaptadores/salida/AdapSalida_AsignacionMemoria';
import { AdapSalida_AsignacionPostgres } from '../infraestructura/adaptadores/salida/AdapSalida_AsignacionPostgres';
import { AdapSalida_BitacoraMemoria } from '../infraestructura/adaptadores/salida/AdapSalida_BitacoraMemoria';
import { AdapSalida_BitacoraPostgres } from '../infraestructura/adaptadores/salida/AdapSalida_BitacoraPostgres';
import { AdapSalida_DeteccionMemoria } from '../infraestructura/adaptadores/salida/AdapSalida_DeteccionMemoria';
import { AdapSalida_DeteccionPostgres } from '../infraestructura/adaptadores/salida/AdapSalida_DeteccionPostgres';
import { AdapSalida_GestoMemoria } from '../infraestructura/adaptadores/salida/AdapSalida_GestoMemoria';
import { AdapSalida_GestoPostgres } from '../infraestructura/adaptadores/salida/AdapSalida_GestoPostgres';
import { AdapSalida_SesionMemoria } from '../infraestructura/adaptadores/salida/AdapSalida_SesionMemoria';
import { AdapSalida_SesionPostgres } from '../infraestructura/adaptadores/salida/AdapSalida_SesionPostgres';
import { AdapSalida_UnidadDeTrabajoMemoria } from '../infraestructura/adaptadores/salida/AdapSalida_UnidadDeTrabajoMemoria';
import { AdapSalida_UnidadDeTrabajoPostgres } from '../infraestructura/adaptadores/salida/AdapSalida_UnidadDeTrabajoPostgres';
import { AdapSalida_UsuarioMemoria } from '../infraestructura/adaptadores/salida/AdapSalida_UsuarioMemoria';
import { AdapSalida_UsuarioPostgres } from '../infraestructura/adaptadores/salida/AdapSalida_UsuarioPostgres';
import { AlmacenMemoria } from '../infraestructura/base_dato/AlmacenMemoria';
import { datosInicialesMemoria } from '../infraestructura/base_dato/datosInicialesMemoria';

/** Puertos de salida de persistencia: los cumple PostgreSQL o la memoria. */
export interface Persistencia {
  usuarios: PuertoSalidaUsuario;
  gestos: PuertoSalidaGesto;
  acciones: PuertoSalidaAccion;
  asignaciones: PuertoSalidaAsignacion;
  sesiones: PuertoSalidaSesion;
  detecciones: PuertoSalidaDeteccion;
  bitacora: PuertoSalidaBitacora;
  unidadDeTrabajo: PuertoSalidaUnidadDeTrabajo;
}

/** Puertos de salida de servicios externos. */
export interface Servicios {
  cifrador: PuertoSalidaCifrador;
  tokens: PuertoSalidaTokens;
  reloj: PuertoSalidaReloj;
  /** Zona horaria por defecto para agrupar por día, por ejemplo America/Guayaquil. */
  zonaHoraria: string;
}

/** Todo lo que el núcleo necesita del exterior: solo puertos. */
export type PuertosDeSalida = Persistencia & Servicios;

/** Adaptadores PostgreSQL (versión 1 del sistema). */
export function crearPersistenciaPostgres(pool: Pool): Persistencia {
  return {
    usuarios: new AdapSalida_UsuarioPostgres(pool),
    gestos: new AdapSalida_GestoPostgres(pool),
    acciones: new AdapSalida_AccionPostgres(pool),
    asignaciones: new AdapSalida_AsignacionPostgres(pool),
    sesiones: new AdapSalida_SesionPostgres(pool),
    detecciones: new AdapSalida_DeteccionPostgres(pool),
    bitacora: new AdapSalida_BitacoraPostgres(pool),
    unidadDeTrabajo: new AdapSalida_UnidadDeTrabajoPostgres(pool),
  };
}

/** Adaptadores en memoria (pruebas, prueba P-09 y REPOSITORIOS=memoria). */
export function crearPersistenciaMemoria(
  reloj: PuertoSalidaReloj,
  almacen = new AlmacenMemoria(datosInicialesMemoria(reloj.ahora())),
): Persistencia {
  const usuarios = new AdapSalida_UsuarioMemoria(almacen, reloj);
  const gestos = new AdapSalida_GestoMemoria(almacen);
  const acciones = new AdapSalida_AccionMemoria(almacen);
  const bitacora = new AdapSalida_BitacoraMemoria(almacen, reloj);
  return {
    usuarios,
    gestos,
    acciones,
    bitacora,
    asignaciones: new AdapSalida_AsignacionMemoria(almacen, reloj),
    sesiones: new AdapSalida_SesionMemoria(almacen, reloj),
    detecciones: new AdapSalida_DeteccionMemoria(almacen),
    unidadDeTrabajo: new AdapSalida_UnidadDeTrabajoMemoria(almacen, { usuarios, gestos, acciones, bitacora }),
  };
}
