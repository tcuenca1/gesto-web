import { ArchivoCsv, ExportarHistorialPuerto, EntradaHistorial } from '../../puertos/entrada/historial';
import { DeteccionRepositorio } from '../../puertos/salida/DeteccionRepositorio';
import { GestoRepositorio } from '../../puertos/salida/GestoRepositorio';
import { Reloj } from '../../puertos/salida/servicios';
import { leerZona } from '../comun';
import { construirFiltro } from './ConsultarHistorial';
import { formatearFechaLocal, generarCsv } from './csv';

/** Límite de filas por archivo, para no saturar el servidor. */
export const MAXIMO_FILAS_CSV = 10000;

/** RF-17 · Exporta el historial propio (con los mismos filtros) a CSV. */
export class ExportarHistorial implements ExportarHistorialPuerto {
  constructor(
    private readonly gestos: GestoRepositorio,
    private readonly detecciones: DeteccionRepositorio,
    private readonly reloj: Reloj,
    private readonly zonaPorDefecto: string,
  ) {}

  async ejecutar(entrada: Omit<EntradaHistorial, 'pagina' | 'limite'> & { zonaHoraria?: unknown }): Promise<ArchivoCsv> {
    const zona = leerZona(entrada.zonaHoraria, this.zonaPorDefecto);
    const filtro = await construirFiltro(this.gestos, entrada, { pagina: 1, limite: MAXIMO_FILAS_CSV });
    const { elementos } = await this.detecciones.historial(filtro);

    const contenido = generarCsv(
      ['id', 'fecha_local', 'fecha_utc', 'gesto', 'codigo_gesto', 'accion', 'confianza', 'mano', 'sesion'],
      elementos.map((d) => [
        d.id,
        formatearFechaLocal(d.fechaHora, zona),
        d.fechaHora.toISOString(),
        d.nombreGesto,
        d.codigoGesto,
        d.nombreAccion,
        d.confianza,
        d.mano,
        d.idSesion,
      ]),
    );
    const hoy = formatearFechaLocal(this.reloj.ahora(), zona).slice(0, 10);
    return { nombreArchivo: `historial-gestoweb-${hoy}.csv`, contenido };
  }
}
