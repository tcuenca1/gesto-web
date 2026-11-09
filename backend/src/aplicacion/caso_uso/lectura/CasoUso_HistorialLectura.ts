import { ErrorValidacion } from '../../../dominio/compartido/errores';
import { EntradaHistorial as FilaHistorial, ResumenEstadisticas, resumirEstadisticas } from '../../../dominio/deteccion/Estadisticas';
import { Paginado } from '../../dto/DtoComun';
import { DtoArchivoCsv, DtoConsultaEstadisticas, DtoConsultaHistorial, DtoExportarHistorial } from '../../dto/DtoHistorial';
import { DtoDeteccion } from '../../dto/DtoReconocimiento';
import { PuertoEntradaHistorialLectura } from '../../puerto/entrada/PuertoEntradaHistorialLectura';
import { FiltroHistorial, PuertoSalidaDeteccion } from '../../puerto/salida/PuertoSalidaDeteccion';
import { PuertoSalidaGesto } from '../../puerto/salida/PuertoSalidaGesto';
import { PuertoSalidaReloj } from '../../puerto/salida/PuertoSalidaReloj';
import { leerPaginacion, leerRango, leerZona } from '../comun';
import { formatearFechaLocal, generarCsv } from '../csv';

/** Límite de filas por archivo, para no saturar el servidor. */
export const MAXIMO_FILAS_CSV = 10000;

/** Convierte una fila del historial en el DTO que ve el usuario. */
function filaARespuesta(fila: FilaHistorial): DtoDeteccion {
  const { idUsuario: _dueno, ...dto } = fila;
  return dto;
}

/** Historial y estadísticas propias del usuario. */
export class CasoUso_HistorialLectura extends PuertoEntradaHistorialLectura {
  constructor(
    private readonly gestos: PuertoSalidaGesto,
    private readonly detecciones: PuertoSalidaDeteccion,
    private readonly reloj: PuertoSalidaReloj,
    private readonly zonaPorDefecto: string,
  ) {
    super();
  }

  /** RF-15 · Historial propio con filtros por fecha y por gesto, paginado. */
  async consultarHistorial(dto: DtoConsultaHistorial): Promise<Paginado<DtoDeteccion>> {
    const paginacion = leerPaginacion(dto.pagina, dto.limite);
    const filtro = await this.construirFiltro(dto, paginacion);
    const { elementos, total } = await this.detecciones.historial(filtro);
    return { elementos: elementos.map(filaARespuesta), total, ...paginacion };
  }

  /**
   * RF-16 · Estadísticas propias: gesto más usado, total por gesto,
   * confianza promedio y uso por día (en la zona horaria del usuario).
   */
  async consultarEstadisticas(dto: DtoConsultaEstadisticas): Promise<ResumenEstadisticas> {
    const rango = leerRango(dto.desde, dto.hasta);
    const zona = leerZona(dto.zonaHoraria, this.zonaPorDefecto);
    const [totales, porDia] = await Promise.all([
      this.detecciones.totalesPorGesto(dto.idUsuario, rango),
      this.detecciones.usoPorDia(dto.idUsuario, rango, zona),
    ]);
    return resumirEstadisticas(totales, porDia);
  }

  /** RF-17 · Exporta el historial propio (con los mismos filtros) a CSV. */
  async exportarHistorial(dto: DtoExportarHistorial): Promise<DtoArchivoCsv> {
    const zona = leerZona(dto.zonaHoraria, this.zonaPorDefecto);
    const filtro = await this.construirFiltro(dto, { pagina: 1, limite: MAXIMO_FILAS_CSV });
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

  /** Filtro común de consultar y exportar, para que ambos entiendan los filtros igual. */
  private async construirFiltro(
    dto: { idUsuario: number; desde?: unknown; hasta?: unknown; gesto?: unknown },
    paginacion: { pagina: number; limite: number },
  ): Promise<FiltroHistorial> {
    const filtro: FiltroHistorial = { idUsuario: dto.idUsuario, ...leerRango(dto.desde, dto.hasta), ...paginacion };
    if (dto.gesto !== undefined && dto.gesto !== '') {
      if (typeof dto.gesto !== 'string') throw new ErrorValidacion('El filtro de gesto debe ser texto');
      const gesto = await this.gestos.buscarPorCodigo(dto.gesto);
      if (!gesto) throw new ErrorValidacion(`El gesto "${dto.gesto}" no existe`);
      filtro.idGesto = gesto.id;
    }
    return filtro;
  }
}
