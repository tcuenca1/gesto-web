import { Model } from 'sequelize';
import { Gesto } from '../../../dominio/gesto/Gesto';
import { PuertoSalidaGesto } from '../../../aplicacion/puerto/salida/PuertoSalidaGesto';
import { ContextoOrm, orm } from '../../base_dato/ConexionSequelize';

interface FilaGesto {
  id_gesto: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  umbral_confianza: number;
  id_accion_predeterminada: number;
  activo: boolean;
}

const aEntidad = (modelo: Model) => {
  const f = modelo.get({ plain: true }) as FilaGesto;
  return Gesto.reconstruir({
    id: f.id_gesto,
    codigo: f.codigo,
    nombre: f.nombre,
    descripcion: f.descripcion,
    umbralConfianza: Number(f.umbral_confianza),
    idAccionPredeterminada: f.id_accion_predeterminada,
    activo: f.activo,
  });
};

/** Adaptador del puerto PuertoSalidaGesto con el ORM Sequelize. */
export class AdapSalida_GestoSequelize extends PuertoSalidaGesto {
  constructor(private readonly ctx: ContextoOrm) {
    super();
  }

  async listar(opciones: { soloActivos?: boolean } = {}): Promise<Gesto[]> {
    return orm(async () => {
      const modelos = await this.ctx.modelos.Gesto.findAll({
        where: opciones.soloActivos ? { activo: true } : {},
        order: [['id_gesto', 'ASC']],
        transaction: this.ctx.transaccion,
      });
      return modelos.map(aEntidad);
    });
  }

  async buscarPorId(id: number): Promise<Gesto | null> {
    return orm(async () => {
      const modelo = await this.ctx.modelos.Gesto.findByPk(id, { transaction: this.ctx.transaccion });
      return modelo ? aEntidad(modelo) : null;
    });
  }

  async buscarPorCodigo(codigo: string): Promise<Gesto | null> {
    return orm(async () => {
      const modelo = await this.ctx.modelos.Gesto.findOne({ where: { codigo }, transaction: this.ctx.transaccion });
      return modelo ? aEntidad(modelo) : null;
    });
  }

  async actualizar(gesto: Gesto): Promise<void> {
    await orm(() =>
      this.ctx.modelos.Gesto.update(
        { nombre: gesto.nombre, descripcion: gesto.descripcion, umbral_confianza: gesto.umbralConfianza, activo: gesto.activo },
        { where: { id_gesto: gesto.id }, transaction: this.ctx.transaccion },
      ),
    );
  }
}
