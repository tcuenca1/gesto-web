import { Asignacion } from '../../../dominio/accion/Asignacion';
import { PuertoSalidaAsignacion } from '../../../aplicacion/puerto/salida/PuertoSalidaAsignacion';
import { consultarOrm, ContextoOrm, ejecutarOrm, orm } from '../../base_dato/ConexionSequelize';

interface FilaAsignacion {
  id_usuario: number;
  id_gesto: number;
  id_accion: number;
  fecha_actualizacion: Date;
}

const aAsignacion = (f: FilaAsignacion): Asignacion => ({
  idUsuario: f.id_usuario,
  idGesto: f.id_gesto,
  idAccion: f.id_accion,
  fechaActualizacion: f.fecha_actualizacion,
});

/** Adaptador del puerto PuertoSalidaAsignacion con el ORM Sequelize. */
export class AdapSalida_AsignacionSequelize extends PuertoSalidaAsignacion {
  constructor(private readonly ctx: ContextoOrm) {
    super();
  }

  async listarDeUsuario(idUsuario: number): Promise<Asignacion[]> {
    return orm(async () => {
      const filas = (await this.ctx.modelos.Asignacion.findAll({
        attributes: ['id_usuario', 'id_gesto', 'id_accion', 'fecha_actualizacion'],
        where: { id_usuario: idUsuario },
        order: [['id_gesto', 'ASC']],
        raw: true,
        transaction: this.ctx.transaccion,
      })) as unknown as FilaAsignacion[];
      return filas.map(aAsignacion);
    });
  }

  async guardar(idUsuario: number, idGesto: number, idAccion: number): Promise<Asignacion> {
    // Un solo INSERT … ON CONFLICT: atómico aunque dos peticiones lleguen a la vez.
    const filas = await consultarOrm<FilaAsignacion>(
      this.ctx,
      `INSERT INTO asignaciones (id_usuario, id_gesto, id_accion) VALUES ($1, $2, $3)
       ON CONFLICT (id_usuario, id_gesto) DO UPDATE SET id_accion = EXCLUDED.id_accion
       RETURNING id_usuario, id_gesto, id_accion, fecha_actualizacion`,
      [idUsuario, idGesto, idAccion],
    );
    return aAsignacion(filas[0]);
  }

  async restaurar(idUsuario: number): Promise<void> {
    await ejecutarOrm(this.ctx, 'CALL sp_restaurar_asignaciones($1)', [idUsuario]);
  }
}
