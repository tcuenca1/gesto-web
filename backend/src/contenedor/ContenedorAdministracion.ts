import { CasoUso_AdministracionEscritura } from '../aplicacion/caso_uso/escritura/CasoUso_AdministracionEscritura';
import { CasoUso_AdministracionLectura } from '../aplicacion/caso_uso/lectura/CasoUso_AdministracionLectura';
import { AdapEntrada_AdministracionWeb } from '../infraestructura/adaptadores/entrada/AdapEntrada_AdministracionWeb';
import { PuertosDeSalida } from './ContenedorPersistencia';

export function crearContenedorAdministracion(p: PuertosDeSalida) {
  const cuLectura = new CasoUso_AdministracionLectura(p.usuarios, p.sesiones, p.detecciones, p.bitacora, p.zonaHoraria);
  const cuEscritura = new CasoUso_AdministracionEscritura(p.unidadDeTrabajo);
  const adap = new AdapEntrada_AdministracionWeb(cuLectura, cuEscritura);
  return { cuLectura, cuEscritura, adap };
}
