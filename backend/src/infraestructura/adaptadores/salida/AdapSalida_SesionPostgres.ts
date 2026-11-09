import { SesionReconocimiento } from '../../../dominio/deteccion/SesionReconocimiento';
import { PuertoSalidaSesion } from '../../../aplicacion/puerto/salida/PuertoSalidaSesion';
import { consultar, Consultor } from '../../base_dato/ConexionPostgresql';

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

/** Adaptador PostgreSQL del puerto PuertoSalidaSesion. */
export class AdapSalida_SesionPostgres extends PuertoSalidaSesion {
  constructor(private readonly bd: Consultor) {
    super();
  }

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
