import { Deteccion, Mano, NuevaDeteccion } from '../../../dominio/deteccion/Deteccion';
import { EntradaHistorial, RangoFechas, TotalPorGesto, UsoPorDia } from '../../../dominio/deteccion/Estadisticas';
import { PuertoSalidaDeteccion, FiltroHistorial, PaginaHistorial, UsoGeneralPorGesto } from '../../../aplicacion/puerto/salida/PuertoSalidaDeteccion';
import { consultarOrm, ContextoOrm, orm } from '../../base_dato/ConexionSequelize';

interface FilaHistorial {
  id_deteccion: number;
  id_sesion: number;
  id_usuario: number;
  codigo_gesto: string;
  nombre_gesto: string;
  codigo_accion: string | null;
  nombre_accion: string | null;
  confianza: number;
  mano: string;
  fecha_hora: Date;
}

/** Construye el WHERE común: usuario (opcional) y rango de fechas. */
function condiciones(idUsuario: number | null, rango: RangoFechas, columnaUsuario: string, columnaFecha: string) {
  const partes: string[] = [];
  const valores: unknown[] = [];
  if (idUsuario !== null) {
    valores.push(idUsuario);
    partes.push(`${columnaUsuario} = $${valores.length}`);
  }
  if (rango.desde) {
    valores.push(rango.desde);
    partes.push(`${columnaFecha} >= $${valores.length}`);
  }
  if (rango.hasta) {
    valores.push(rango.hasta);
    partes.push(`${columnaFecha} < $${valores.length}`);
  }
  return { where: partes.length ? `WHERE ${partes.join(' AND ')}` : '', valores };
}

/**
 * Adaptador del puerto PuertoSalidaDeteccion con el ORM Sequelize.
 * Guardar y contar usan el modelo; el historial y las estadísticas leen las
 * vistas y la función de la base de datos (SRS §9.3), que no son un modelo.
 */
export class AdapSalida_DeteccionSequelize extends PuertoSalidaDeteccion {
  constructor(private readonly ctx: ContextoOrm) {
    super();
  }

  async guardar(nueva: NuevaDeteccion): Promise<Deteccion> {
    // trg_validar_sesion_abierta rechaza la fila si la sesión está cerrada (error GW001)
    // y trg_contar_detecciones suma 1 al total de la sesión.
    const creada = await orm(() =>
      this.ctx.modelos.Deteccion.create(
        {
          id_sesion: nueva.idSesion,
          id_gesto: nueva.idGesto,
          id_accion: nueva.idAccion,
          confianza: nueva.confianza,
          mano: nueva.mano,
          fecha_hora: nueva.fechaHora,
        },
        { transaction: this.ctx.transaccion },
      ),
    );
    return { ...nueva, id: Number(creada.get('id_deteccion')), mano: nueva.mano as Mano };
  }

  async historial(filtro: FiltroHistorial): Promise<PaginaHistorial> {
    const { where, valores } = condiciones(filtro.idUsuario, filtro, 'id_usuario', 'fecha_hora');
    let clausula = where;
    if (filtro.idGesto !== undefined) {
      valores.push(filtro.idGesto);
      clausula += `${clausula ? ' AND' : 'WHERE'} id_gesto = $${valores.length}`;
    }
    const [conteo, pagina] = await Promise.all([
      consultarOrm<{ total: number }>(this.ctx, `SELECT COUNT(*) AS total FROM v_historial ${clausula}`, valores),
      consultarOrm<FilaHistorial>(
        this.ctx,
        `SELECT id_deteccion, id_sesion, id_usuario, codigo_gesto, nombre_gesto, codigo_accion, nombre_accion, confianza, mano, fecha_hora FROM v_historial ${clausula}
          ORDER BY fecha_hora DESC, id_deteccion DESC
          LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}`,
        [...valores, filtro.limite, (filtro.pagina - 1) * filtro.limite],
      ),
    ]);
    return {
      total: Number(conteo[0].total),
      elementos: pagina.map(
        (f): EntradaHistorial => ({
          id: Number(f.id_deteccion),
          idSesion: f.id_sesion,
          idUsuario: f.id_usuario,
          codigoGesto: f.codigo_gesto,
          nombreGesto: f.nombre_gesto,
          codigoAccion: f.codigo_accion,
          nombreAccion: f.nombre_accion,
          confianza: Number(f.confianza),
          mano: f.mano,
          fechaHora: f.fecha_hora,
        }),
      ),
    };
  }

  async totalesPorGesto(idUsuario: number | null, rango: RangoFechas): Promise<TotalPorGesto[]> {
    type Fila = { id_gesto: number; codigo: string; nombre: string; total: number; confianza_promedio: number };
    let filas: Fila[];
    if (idUsuario !== null) {
      // Función de la base de datos (SRS §9.3).
      filas = await consultarOrm<Fila>(
        this.ctx,
        'SELECT id_gesto, codigo, nombre, total, confianza_promedio FROM fn_estadisticas_usuario($1, $2::timestamp, $3::timestamp)',
        [idUsuario, rango.desde ?? null, rango.hasta ?? null],
      );
    } else {
      const { where, valores } = condiciones(null, rango, '', 'd.fecha_hora');
      filas = await consultarOrm<Fila>(
        this.ctx,
        `SELECT g.id_gesto, g.codigo, g.nombre, COUNT(d.id_deteccion) AS total,
                COALESCE(ROUND(AVG(d.confianza), 3), 0) AS confianza_promedio
           FROM gestos g
           LEFT JOIN (SELECT d.id_deteccion, d.id_gesto, d.confianza FROM detecciones d ${where}) d ON d.id_gesto = g.id_gesto
          GROUP BY g.id_gesto ORDER BY g.id_gesto`,
        valores,
      );
    }
    return filas.map((f) => ({
      idGesto: f.id_gesto,
      codigo: f.codigo,
      nombre: f.nombre,
      total: Number(f.total),
      confianzaPromedio: Number(f.confianza_promedio),
    }));
  }

  async usoPorDia(idUsuario: number | null, rango: RangoFechas, zonaHoraria: string): Promise<UsoPorDia[]> {
    const { where, valores } = condiciones(idUsuario, rango, 's.id_usuario', 'd.fecha_hora');
    valores.push(zonaHoraria);
    const filas = await consultarOrm<{ dia: string; total: number }>(
      this.ctx,
      `SELECT TO_CHAR((d.fecha_hora AT TIME ZONE 'UTC') AT TIME ZONE $${valores.length}, 'YYYY-MM-DD') AS dia,
              COUNT(*) AS total
         FROM detecciones d
         JOIN sesiones_reconocimiento s ON s.id_sesion = d.id_sesion
         ${where}
        GROUP BY dia ORDER BY dia`,
      valores,
    );
    return filas.map((f) => ({ dia: f.dia, total: Number(f.total) }));
  }

  async usoGeneral(): Promise<UsoGeneralPorGesto[]> {
    const filas = await consultarOrm<{
      id_gesto: number; codigo: string; nombre: string; activo: boolean;
      total_detecciones: number; confianza_promedio: number; usuarios_distintos: number;
    }>(this.ctx, 'SELECT id_gesto, codigo, nombre, activo, total_detecciones, confianza_promedio, usuarios_distintos FROM v_estadisticas_generales');
    return filas.map((f) => ({
      idGesto: f.id_gesto,
      codigo: f.codigo,
      nombre: f.nombre,
      activo: f.activo,
      total: Number(f.total_detecciones),
      confianzaPromedio: Number(f.confianza_promedio),
      usuariosDistintos: Number(f.usuarios_distintos),
    }));
  }

  async contar(): Promise<number> {
    return orm(() => this.ctx.modelos.Deteccion.count({ transaction: this.ctx.transaccion }));
  }
}
