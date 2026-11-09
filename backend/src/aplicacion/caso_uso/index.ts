import { PuertoEntradaAccionEscritura } from '../puerto/entrada/PuertoEntradaAccionEscritura';
import { PuertoEntradaAccionLectura } from '../puerto/entrada/PuertoEntradaAccionLectura';
import { PuertoEntradaAdministracionEscritura } from '../puerto/entrada/PuertoEntradaAdministracionEscritura';
import { PuertoEntradaAdministracionLectura } from '../puerto/entrada/PuertoEntradaAdministracionLectura';
import { PuertoEntradaHistorialLectura } from '../puerto/entrada/PuertoEntradaHistorialLectura';
import { PuertoEntradaReconocimientoEscritura } from '../puerto/entrada/PuertoEntradaReconocimientoEscritura';
import { PuertoEntradaUsuarioEscritura } from '../puerto/entrada/PuertoEntradaUsuarioEscritura';
import { PuertoEntradaUsuarioLectura } from '../puerto/entrada/PuertoEntradaUsuarioLectura';
import { PuertoSalidaAccion } from '../puerto/salida/PuertoSalidaAccion';
import { PuertoSalidaAsignacion } from '../puerto/salida/PuertoSalidaAsignacion';
import { PuertoSalidaBitacora } from '../puerto/salida/PuertoSalidaBitacora';
import { PuertoSalidaCifrador } from '../puerto/salida/PuertoSalidaCifrador';
import { PuertoSalidaDeteccion } from '../puerto/salida/PuertoSalidaDeteccion';
import { PuertoSalidaGesto } from '../puerto/salida/PuertoSalidaGesto';
import { PuertoSalidaReloj } from '../puerto/salida/PuertoSalidaReloj';
import { PuertoSalidaSesion } from '../puerto/salida/PuertoSalidaSesion';
import { PuertoSalidaTokens } from '../puerto/salida/PuertoSalidaTokens';
import { PuertoSalidaUnidadDeTrabajo } from '../puerto/salida/PuertoSalidaUnidadDeTrabajo';
import { PuertoSalidaUsuario } from '../puerto/salida/PuertoSalidaUsuario';
import { CasoUso_AccionEscritura } from './escritura/CasoUso_AccionEscritura';
import { CasoUso_AdministracionEscritura } from './escritura/CasoUso_AdministracionEscritura';
import { CasoUso_ReconocimientoEscritura } from './escritura/CasoUso_ReconocimientoEscritura';
import { CasoUso_UsuarioEscritura } from './escritura/CasoUso_UsuarioEscritura';
import { CasoUso_AccionLectura } from './lectura/CasoUso_AccionLectura';
import { CasoUso_AdministracionLectura } from './lectura/CasoUso_AdministracionLectura';
import { CasoUso_HistorialLectura } from './lectura/CasoUso_HistorialLectura';
import { CasoUso_UsuarioLectura } from './lectura/CasoUso_UsuarioLectura';

/** Todo lo que el núcleo necesita del exterior: solo puertos, ningún adaptador concreto. */
export interface PuertosDeSalida {
  usuarios: PuertoSalidaUsuario;
  gestos: PuertoSalidaGesto;
  acciones: PuertoSalidaAccion;
  asignaciones: PuertoSalidaAsignacion;
  sesiones: PuertoSalidaSesion;
  detecciones: PuertoSalidaDeteccion;
  bitacora: PuertoSalidaBitacora;
  unidadDeTrabajo: PuertoSalidaUnidadDeTrabajo;
  cifrador: PuertoSalidaCifrador;
  tokens: PuertoSalidaTokens;
  reloj: PuertoSalidaReloj;
  /** Zona horaria por defecto para agrupar por día, por ejemplo America/Guayaquil. */
  zonaHoraria: string;
}

/** Los puertos de entrada del hexágono, por módulo. */
export interface CasosDeUso {
  usuario: { lectura: PuertoEntradaUsuarioLectura; escritura: PuertoEntradaUsuarioEscritura };
  reconocimiento: { escritura: PuertoEntradaReconocimientoEscritura };
  accion: { lectura: PuertoEntradaAccionLectura; escritura: PuertoEntradaAccionEscritura };
  historial: { lectura: PuertoEntradaHistorialLectura };
  administracion: { lectura: PuertoEntradaAdministracionLectura; escritura: PuertoEntradaAdministracionEscritura };
}

/** Arma los casos de uso a partir de los puertos (inyección por constructor). */
export function crearCasosDeUso(p: PuertosDeSalida): CasosDeUso {
  const accionLectura = new CasoUso_AccionLectura(p.gestos, p.acciones, p.asignaciones);
  return {
    usuario: {
      lectura: new CasoUso_UsuarioLectura(p.usuarios, p.tokens),
      escritura: new CasoUso_UsuarioEscritura(p.usuarios, p.cifrador, p.tokens, p.reloj),
    },
    reconocimiento: {
      escritura: new CasoUso_ReconocimientoEscritura(p.sesiones, p.gestos, p.acciones, p.asignaciones, p.detecciones, p.reloj),
    },
    accion: {
      lectura: accionLectura,
      escritura: new CasoUso_AccionEscritura(p.gestos, p.acciones, p.asignaciones, accionLectura),
    },
    historial: {
      lectura: new CasoUso_HistorialLectura(p.gestos, p.detecciones, p.reloj, p.zonaHoraria),
    },
    administracion: {
      lectura: new CasoUso_AdministracionLectura(p.usuarios, p.sesiones, p.detecciones, p.bitacora, p.zonaHoraria),
      escritura: new CasoUso_AdministracionEscritura(p.unidadDeTrabajo),
    },
  };
}
