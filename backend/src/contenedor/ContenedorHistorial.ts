import { CasoUso_HistorialLectura } from '../aplicacion/caso_uso/lectura/CasoUso_HistorialLectura';
import { AdapEntrada_HistorialWeb } from '../infraestructura/adaptadores/entrada/AdapEntrada_HistorialWeb';
import { PuertosDeSalida } from './ContenedorPersistencia';

export function crearContenedorHistorial(p: PuertosDeSalida) {
  const cuLectura = new CasoUso_HistorialLectura(p.gestos, p.detecciones, p.reloj, p.zonaHoraria);
  const adap = new AdapEntrada_HistorialWeb(cuLectura);
  return { cuLectura, adap };
}
