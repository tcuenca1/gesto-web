import { CasoUso_ReconocimientoEscritura } from '../aplicacion/caso_uso/escritura/CasoUso_ReconocimientoEscritura';
import { AdapEntrada_ReconocimientoWeb } from '../infraestructura/adaptadores/entrada/AdapEntrada_ReconocimientoWeb';
import { PuertosDeSalida } from './ContenedorPersistencia';

export function crearContenedorReconocimiento(p: PuertosDeSalida) {
  const cuEscritura = new CasoUso_ReconocimientoEscritura(p.sesiones, p.gestos, p.acciones, p.asignaciones, p.detecciones, p.reloj);
  const adap = new AdapEntrada_ReconocimientoWeb(cuEscritura);
  return { cuEscritura, adap };
}
