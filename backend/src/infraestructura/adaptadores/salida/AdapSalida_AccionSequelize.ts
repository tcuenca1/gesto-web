import { Model } from 'sequelize';
import { Accion, NuevaAccion } from '../../../dominio/accion/Accion';
import { PuertoSalidaAccion } from '../../../aplicacion/puerto/salida/PuertoSalidaAccion';
import { ContextoOrm, orm } from '../../base_dato/ConexionSequelize';

interface FilaAccion {
  id_accion: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
}

const aEntidad = (modelo: Model) => {
  const f = modelo.get({ plain: true }) as FilaAccion;
  return Accion.reconstruir({ id: f.id_accion, codigo: f.codigo, nombre: f.nombre, descripcion: f.descripcion, activa: f.activa });
};

/** Adaptador del puerto PuertoSalidaAccion con el ORM Sequelize. */
export class AdapSalida_AccionSequelize extends PuertoSalidaAccion {
  constructor(private readonly ctx: ContextoOrm) {
    super();
  }

  async listar(opciones: { soloActivas?: boolean } = {}): Promise<Accion[]> {
    return orm(async () => {
      const modelos = await this.ctx.modelos.Accion.findAll({
        where: opciones.soloActivas ? { activa: true } : {},
        order: [['id_accion', 'ASC']],
        transaction: this.ctx.transaccion,
      });
      return modelos.map(aEntidad);
    });
  }

  async buscarPorId(id: number): Promise<Accion | null> {
    return orm(async () => {
      const modelo = await this.ctx.modelos.Accion.findByPk(id, { transaction: this.ctx.transaccion });
      return modelo ? aEntidad(modelo) : null;
    });
  }

  async buscarPorCodigo(codigo: string): Promise<Accion | null> {
    return orm(async () => {
      const modelo = await this.ctx.modelos.Accion.findOne({ where: { codigo }, transaction: this.ctx.transaccion });
      return modelo ? aEntidad(modelo) : null;
    });
  }

  async crear(nueva: NuevaAccion): Promise<Accion> {
    return orm(async () => {
      const modelo = await this.ctx.modelos.Accion.create(
        { codigo: nueva.codigo, nombre: nueva.nombre, descripcion: nueva.descripcion },
        { transaction: this.ctx.transaccion },
      );
      return aEntidad(modelo);
    });
  }

  async actualizar(accion: Accion): Promise<void> {
    await orm(() =>
      this.ctx.modelos.Accion.update(
        { nombre: accion.nombre, descripcion: accion.descripcion, activa: accion.activa },
        { where: { id_accion: accion.id }, transaction: this.ctx.transaccion },
      ),
    );
  }

  async esPredeterminadaDeAlgunGesto(idAccion: number): Promise<boolean> {
    return orm(async () => {
      const total = await this.ctx.modelos.Gesto.count({
        where: { id_accion_predeterminada: idAccion },
        transaction: this.ctx.transaccion,
      });
      return total > 0;
    });
  }
}
