import { Model } from 'sequelize';
import { SesionReconocimiento } from '../../../dominio/deteccion/SesionReconocimiento';
import { PuertoSalidaSesion } from '../../../aplicacion/puerto/salida/PuertoSalidaSesion';
import { consultarOrm, ContextoOrm, ejecutarOrm, orm } from '../../base_dato/ConexionSequelize';

interface FilaSesion {
  id_sesion: number;
  id_usuario: number;
  fecha_inicio: Date;
  fecha_fin: Date | null;
  navegador: string | null;
  total_detecciones: number;
}

const aEntidad = (modelo: Model) => {
  const f = modelo.get({ plain: true }) as FilaSesion;
  return SesionReconocimiento.reconstruir({
    id: f.id_sesion,
    idUsuario: f.id_usuario,
    fechaInicio: f.fecha_inicio,
    fechaFin: f.fecha_fin,
    navegador: f.navegador,
    totalDetecciones: f.total_detecciones,
  });
};

/** Adaptador del puerto PuertoSalidaSesion con el ORM Sequelize. */
export class AdapSalida_SesionSequelize extends PuertoSalidaSesion {
  constructor(private readonly ctx: ContextoOrm) {
    super();
  }

  async abrir(idUsuario: number, navegador: string | null): Promise<SesionReconocimiento> {
    // El procedimiento cierra la sesión que haya quedado abierta y abre una nueva.
    const filas = await consultarOrm<{ p_id_sesion: number }>(this.ctx, 'CALL sp_abrir_sesion($1, $2, NULL)', [idUsuario, navegador]);
    return (await this.buscarPorId(filas[0].p_id_sesion))!;
  }

  async buscarPorId(id: number): Promise<SesionReconocimiento | null> {
    return orm(async () => {
      const modelo = await this.ctx.modelos.Sesion.findByPk(id, { transaction: this.ctx.transaccion });
      return modelo ? aEntidad(modelo) : null;
    });
  }

  async cerrar(sesion: SesionReconocimiento): Promise<void> {
    // GREATEST: PostgreSQL guarda microsegundos y JavaScript solo milisegundos;
    // así la hora de cierre nunca queda "antes" del inicio por redondeo.
    await ejecutarOrm(
      this.ctx,
      `UPDATE sesiones_reconocimiento SET fecha_fin = GREATEST(fecha_inicio, $2::timestamp)
        WHERE id_sesion = $1 AND fecha_fin IS NULL`,
      [sesion.id, sesion.fechaFin],
    );
  }

  async contar(): Promise<number> {
    return orm(() => this.ctx.modelos.Sesion.count({ transaction: this.ctx.transaccion }));
  }
}
