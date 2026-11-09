import { ErrorConflicto } from '../../../dominio/compartido/errores';
import { Deteccion, NuevaDeteccion } from '../../../dominio/deteccion/Deteccion';
import { EntradaHistorial, RangoFechas, TotalPorGesto, UsoPorDia } from '../../../dominio/deteccion/Estadisticas';
import { PuertoSalidaDeteccion, FiltroHistorial, PaginaHistorial, UsoGeneralPorGesto } from '../../../aplicacion/puerto/salida/PuertoSalidaDeteccion';
import { AlmacenMemoria } from '../../base_dato/AlmacenMemoria';

const redondear = (n: number, decimales = 3) => Math.round(n * 10 ** decimales) / 10 ** decimales;

/** Adaptador en memoria de PuertoSalidaDeteccion (pruebas y P-09). */
export class AdapSalida_DeteccionMemoria extends PuertoSalidaDeteccion {
  constructor(private readonly almacen: AlmacenMemoria) {
    super();
  }

  async guardar(nueva: NuevaDeteccion): Promise<Deteccion> {
    const e = this.almacen.estado;
    const sesion = e.sesiones.find((s) => s.id === nueva.idSesion);
    // Imita trg_validar_sesion_abierta y trg_contar_detecciones.
    if (!sesion || sesion.fechaFin !== null) throw new ErrorConflicto('La sesión de reconocimiento ya está cerrada', 'SESION_CERRADA');
    const deteccion = { ...nueva, id: this.almacen.siguienteId('detecciones') };
    e.detecciones.push(deteccion);
    sesion.totalDetecciones += 1;
    return { ...deteccion };
  }

  async historial(filtro: FiltroHistorial): Promise<PaginaHistorial> {
    const filas = this.filas(filtro.idUsuario, filtro)
      .filter((f) => filtro.idGesto === undefined || f.idGesto === filtro.idGesto)
      .sort((a, b) => b.fechaHora.getTime() - a.fechaHora.getTime() || b.id - a.id);
    const inicio = (filtro.pagina - 1) * filtro.limite;
    return {
      total: filas.length,
      elementos: filas.slice(inicio, inicio + filtro.limite).map(({ idGesto: _g, ...fila }) => fila),
    };
  }

  async totalesPorGesto(idUsuario: number | null, rango: RangoFechas): Promise<TotalPorGesto[]> {
    const filas = this.filas(idUsuario, rango);
    return [...this.almacen.estado.gestos]
      .sort((a, b) => a.id - b.id)
      .map((g) => {
        const delGesto = filas.filter((f) => f.idGesto === g.id);
        const suma = delGesto.reduce((s, f) => s + f.confianza, 0);
        return {
          idGesto: g.id,
          codigo: g.codigo,
          nombre: g.nombre,
          total: delGesto.length,
          confianzaPromedio: delGesto.length ? redondear(suma / delGesto.length) : 0,
        };
      });
  }

  async usoPorDia(idUsuario: number | null, rango: RangoFechas, zonaHoraria: string): Promise<UsoPorDia[]> {
    const formato = new Intl.DateTimeFormat('en-CA', { timeZone: zonaHoraria, year: 'numeric', month: '2-digit', day: '2-digit' });
    const conteo = new Map<string, number>();
    for (const f of this.filas(idUsuario, rango)) {
      const dia = formato.format(f.fechaHora);
      conteo.set(dia, (conteo.get(dia) ?? 0) + 1);
    }
    return [...conteo].map(([dia, total]) => ({ dia, total })).sort((a, b) => a.dia.localeCompare(b.dia));
  }

  async usoGeneral(): Promise<UsoGeneralPorGesto[]> {
    const totales = await this.totalesPorGesto(null, {});
    const filas = this.filas(null, {});
    return totales.map((t) => ({
      ...t,
      activo: this.almacen.estado.gestos.find((g) => g.id === t.idGesto)?.activo ?? false,
      usuariosDistintos: new Set(filas.filter((f) => f.idGesto === t.idGesto).map((f) => f.idUsuario)).size,
    }));
  }

  async contar(): Promise<number> {
    return this.almacen.estado.detecciones.length;
  }

  /** Equivalente a la vista v_historial, filtrada por usuario y fechas. */
  private filas(idUsuario: number | null, rango: RangoFechas): Array<EntradaHistorial & { idGesto: number }> {
    const e = this.almacen.estado;
    return e.detecciones.flatMap((d) => {
      const sesion = e.sesiones.find((s) => s.id === d.idSesion);
      if (!sesion || (idUsuario !== null && sesion.idUsuario !== idUsuario)) return [];
      if (rango.desde && d.fechaHora < rango.desde) return [];
      if (rango.hasta && d.fechaHora >= rango.hasta) return [];
      const gesto = e.gestos.find((g) => g.id === d.idGesto);
      const accion = e.acciones.find((a) => a.id === d.idAccion);
      return [{
        id: d.id,
        idSesion: d.idSesion,
        idUsuario: sesion.idUsuario,
        idGesto: d.idGesto,
        codigoGesto: gesto?.codigo ?? '',
        nombreGesto: gesto?.nombre ?? '',
        codigoAccion: accion?.codigo ?? null,
        nombreAccion: accion?.nombre ?? null,
        confianza: d.confianza,
        mano: d.mano,
        fechaHora: d.fechaHora,
      }];
    });
  }
}
