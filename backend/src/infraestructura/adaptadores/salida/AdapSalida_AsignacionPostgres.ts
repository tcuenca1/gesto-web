import { Asignacion } from '../../../dominio/accion/Asignacion';
import { PuertoSalidaAsignacion } from '../../../aplicacion/puerto/salida/PuertoSalidaAsignacion';
import { consultar, Consultor } from '../../base_dato/ConexionPostgresql';

// ---------------------------------------------------------------------
// Asignaciones
// ---------------------------------------------------------------------
interface FilaAsignacion {
  id_usuario: number;
  id_gesto: number;
  id_accion: number;
  fecha_actualizacion: Date;
}

const asignacionDesdeFila = (f: FilaAsignacion): Asignacion => ({
  idUsuario: f.id_usuario,
  idGesto: f.id_gesto,
  idAccion: f.id_accion,
  fechaActualizacion: f.fecha_actualizacion,
});

/** Adaptador PostgreSQL del puerto PuertoSalidaAsignacion. */
export class AdapSalida_AsignacionPostgres extends PuertoSalidaAsignacion {
  constructor(private readonly bd: Consultor) {
    super();
  }

  async listarDeUsuario(idUsuario: number): Promise<Asignacion[]> {
    const { rows } = await consultar<FilaAsignacion>(
      this.bd,
      'SELECT id_usuario, id_gesto, id_accion, fecha_actualizacion FROM asignaciones WHERE id_usuario = $1 ORDER BY id_gesto',
      [idUsuario],
    );
    return rows.map(asignacionDesdeFila);
  }

  async guardar(idUsuario: number, idGesto: number, idAccion: number): Promise<Asignacion> {
    const { rows } = await consultar<FilaAsignacion>(
      this.bd,
      `INSERT INTO asignaciones (id_usuario, id_gesto, id_accion) VALUES ($1, $2, $3)
       ON CONFLICT (id_usuario, id_gesto) DO UPDATE SET id_accion = EXCLUDED.id_accion
       RETURNING id_usuario, id_gesto, id_accion, fecha_actualizacion`,
      [idUsuario, idGesto, idAccion],
    );
    return asignacionDesdeFila(rows[0]);
  }

  async restaurar(idUsuario: number): Promise<void> {
    await consultar(this.bd, 'CALL sp_restaurar_asignaciones($1)', [idUsuario]);
  }
}
