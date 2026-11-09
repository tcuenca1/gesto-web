import { ResumenEstadisticas, resumirEstadisticas } from '../../../dominio/deteccion/Estadisticas';
import { ConsultarEstadisticasPuerto } from '../../puertos/entrada/historial';
import { DtoConsultaEstadisticas } from '../../dto/DtoHistorial';
import { PuertoSalidaDeteccion } from '../../puerto/salida/PuertoSalidaDeteccion';
import { leerRango, leerZona } from '../comun';

/**
 * RF-16 · Estadísticas propias: gesto más usado, total por gesto,
 * confianza promedio y uso por día (en la zona horaria del usuario).
 */
export class ConsultarEstadisticas implements ConsultarEstadisticasPuerto {
  constructor(
    private readonly detecciones: PuertoSalidaDeteccion,
    private readonly zonaPorDefecto: string,
  ) {}

  async ejecutar(entrada: DtoConsultaEstadisticas): Promise<ResumenEstadisticas> {
    const rango = leerRango(entrada.desde, entrada.hasta);
    const zona = leerZona(entrada.zonaHoraria, this.zonaPorDefecto);
    const [totales, porDia] = await Promise.all([
      this.detecciones.totalesPorGesto(entrada.idUsuario, rango),
      this.detecciones.usoPorDia(entrada.idUsuario, rango, zona),
    ]);
    return resumirEstadisticas(totales, porDia);
  }
}
