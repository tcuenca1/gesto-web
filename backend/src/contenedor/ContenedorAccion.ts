import { CasoUso_AccionEscritura } from '../aplicacion/caso_uso/escritura/CasoUso_AccionEscritura';
import { CasoUso_AccionLectura } from '../aplicacion/caso_uso/lectura/CasoUso_AccionLectura';
import { AdapEntrada_AccionWeb } from '../infraestructura/adaptadores/entrada/AdapEntrada_AccionWeb';
import { PuertosDeSalida } from './ContenedorPersistencia';

export function crearContenedorAccion(p: PuertosDeSalida) {
  const cuLectura = new CasoUso_AccionLectura(p.gestos, p.acciones, p.asignaciones);
  const cuEscritura = new CasoUso_AccionEscritura(p.gestos, p.acciones, p.asignaciones, cuLectura);
  const adap = new AdapEntrada_AccionWeb(cuLectura, cuEscritura);
  return { cuLectura, cuEscritura, adap };
}
