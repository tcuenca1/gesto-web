import { Deteccion, Mano, NuevaDeteccion } from '../../../dominio/deteccion/Deteccion';
import { EntradaHistorial, RangoFechas, TotalPorGesto, UsoPorDia } from '../../../dominio/deteccion/Estadisticas';
import { SesionReconocimiento } from '../../../dominio/deteccion/SesionReconocimiento';
import {
  DeteccionRepositorio,
  FiltroHistorial,
  PaginaHistorial,
  UsoGeneralPorGesto,
} from '../../../aplicacion/puertos/salida/DeteccionRepositorio';
import { SesionRepositorio } from '../../../aplicacion/puertos/salida/SesionRepositorio';
import { consultar, Consultor } from './conexion';

// ---------------------------------------------------------------------
// Sesiones de reconocimiento
// ---------------------------------------------------------------------
interface FilaSesion {
  id_sesion: number;
  id_usuario: number;
  fecha_inicio: Date;
  fecha_fin: Date | null;
  navegador: string | null;
  total_detecciones: number;
}

const sesionDesdeFila = (f: FilaSesion) =>
  SesionReconocimiento.reconstruir({
    id: f.id_sesion,
    idUsuario: f.id_usuario,
    fechaInicio: f.fecha_inicio,
    fechaFin: f.fecha_fin,
    navegador: f.navegador,
    totalDetecciones: f.total_detecciones,
  });

/** Adaptador PostgreSQL del puerto SesionRepositorio. */
export class SesionRepositorioPg implements SesionRepositorio {
  constructor(private readonly bd: Consultor) {}

  async abrir(idUsuario: number, navegador: string | null): Promise<SesionReconocimiento> {
    // El procedimiento cierra la sesión que haya quedado abierta y abre una nueva.
    const { rows } = await consultar<{ p_id_sesion: number }>(this.bd, 'CALL sp_abrir_sesion($1, $2, NULL)', [
      idUsuario,
      navegador,
    ]);
    return (await this.buscarPorId(rows[0].p_id_sesion))!;
  }

  async buscarPorId(id: number): Promise<SesionReconocimiento | null> {
    const { rows } = await consultar<FilaSesion>(this.bd, 'SELECT * FROM sesiones_reconocimiento WHERE id_sesion = $1', [id]);
    return rows[0] ? sesionDesdeFila(rows[0]) : null;
  }

  async cerrar(sesion: SesionReconocimiento): Promise<void> {
    // GREATEST: PostgreSQL guarda microsegundos y JavaScript solo milisegundos;
    // así la hora de cierre nunca queda "antes" del inicio por redondeo.
    await consultar(
      this.bd,
      `UPDATE sesiones_reconocimiento SET fecha_fin = GREATEST(fecha_inicio, $2::timestamp)
        WHERE id_sesion = $1 AND fecha_fin IS NULL`,
      [sesion.id, sesion.fechaFin],
    );
  }

  async contar(): Promise<number> {
    const { rows } = await consultar<{ total: number }>(this.bd, 'SELECT COUNT(*) AS total FROM sesiones_reconocimiento');
    return rows[0].total;
  }
}

// ---------------------------------------------------------------------
// Detecciones, historial y estadísticas
// ---------------------------------------------------------------------
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

/** Adaptador PostgreSQL del puerto DeteccionRepositorio. */
export class DeteccionRepositorioPg implements DeteccionRepositorio {
  constructor(private readonly bd: Consultor) {}

  async guardar(nueva: NuevaDeteccion): Promise<Deteccion> {
    // trg_validar_sesion_abierta rechaza la fila si la sesión está cerrada (error GW001)
    // y trg_contar_detecciones suma 1 al total de la sesión.
    const { rows } = await consultar<{ id_deteccion: number }>(
      this.bd,
      `INSERT INTO detecciones (id_sesion, id_gesto, id_accion, confianza, mano, fecha_hora)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_deteccion`,
      [nueva.idSesion, nueva.idGesto, nueva.idAccion, nueva.confianza, nueva.mano, nueva.fechaHora],
    );
    return { ...nueva, id: rows[0].id_deteccion, mano: nueva.mano as Mano };
  }

  async historial(filtro: FiltroHistorial): Promise<PaginaHistorial> {
    const { where, valores } = condiciones(filtro.idUsuario, filtro, 'id_usuario', 'fecha_hora');
    let clausula = where;
    if (filtro.idGesto !== undefined) {
      valores.push(filtro.idGesto);
      clausula += `${clausula ? ' AND' : 'WHERE'} id_gesto = $${valores.length}`;
    }
    const [conteo, pagina] = await Promise.all([
      consultar<{ total: number }>(this.bd, `SELECT COUNT(*) AS total FROM v_historial ${clausula}`, valores),
      consultar<FilaHistorial>(
        this.bd,
        `SELECT * FROM v_historial ${clausula}
          ORDER BY fecha_hora DESC, id_deteccion DESC
          LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}`,
        [...valores, filtro.limite, (filtro.pagina - 1) * filtro.limite],
      ),
    ]);
    return {
      total: conteo.rows[0].total,
      elementos: pagina.rows.map(
        (f): EntradaHistorial => ({
          id: f.id_deteccion,
          idSesion: f.id_sesion,
          idUsuario: f.id_usuario,
          codigoGesto: f.codigo_gesto,
          nombreGesto: f.nombre_gesto,
          codigoAccion: f.codigo_accion,
          nombreAccion: f.nombre_accion,
          confianza: f.confianza,
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
      ({ rows: filas } = await consultar<Fila>(
        this.bd,
        'SELECT * FROM fn_estadisticas_usuario($1, $2::timestamp, $3::timestamp)',
        [idUsuario, rango.desde ?? null, rango.hasta ?? null],
      ));
    } else {
      const { where, valores } = condiciones(null, rango, '', 'd.fecha_hora');
      ({ rows: filas } = await consultar<Fila>(
        this.bd,
        `SELECT g.id_gesto, g.codigo, g.nombre, COUNT(d.id_deteccion) AS total,
                COALESCE(ROUND(AVG(d.confianza), 3), 0) AS confianza_promedio
           FROM gestos g
           LEFT JOIN (SELECT * FROM detecciones d ${where}) d ON d.id_gesto = g.id_gesto
          GROUP BY g.id_gesto ORDER BY g.id_gesto`,
        valores,
      ));
    }
    return filas.map((f) => ({
      idGesto: f.id_gesto,
      codigo: f.codigo,
      nombre: f.nombre,
      total: f.total,
      confianzaPromedio: f.confianza_promedio,
    }));
  }

  async usoPorDia(idUsuario: number | null, rango: RangoFechas, zonaHoraria: string): Promise<UsoPorDia[]> {
    const { where, valores } = condiciones(idUsuario, rango, 's.id_usuario', 'd.fecha_hora');
    valores.push(zonaHoraria);
    const { rows } = await consultar<{ dia: string; total: number }>(
      this.bd,
      `SELECT TO_CHAR((d.fecha_hora AT TIME ZONE 'UTC') AT TIME ZONE $${valores.length}, 'YYYY-MM-DD') AS dia,
              COUNT(*) AS total
         FROM detecciones d
         JOIN sesiones_reconocimiento s ON s.id_sesion = d.id_sesion
         ${where}
        GROUP BY dia ORDER BY dia`,
      valores,
    );
    return rows;
  }

  async usoGeneral(): Promise<UsoGeneralPorGesto[]> {
    const { rows } = await consultar<{
      id_gesto: number; codigo: string; nombre: string; activo: boolean;
      total_detecciones: number; confianza_promedio: number; usuarios_distintos: number;
    }>(this.bd, 'SELECT * FROM v_estadisticas_generales');
    return rows.map((f) => ({
      idGesto: f.id_gesto,
      codigo: f.codigo,
      nombre: f.nombre,
      activo: f.activo,
      total: f.total_detecciones,
      confianzaPromedio: f.confianza_promedio,
      usuariosDistintos: f.usuarios_distintos,
    }));
  }

  async contar(): Promise<number> {
    const { rows } = await consultar<{ total: number }>(this.bd, 'SELECT COUNT(*) AS total FROM detecciones');
    return rows[0].total;
  }
}
