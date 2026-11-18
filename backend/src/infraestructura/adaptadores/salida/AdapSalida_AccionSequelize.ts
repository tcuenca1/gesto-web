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

/** Columnas que se piden siempre: nunca SELECT *. */
const COLUMNAS = ['id_accion', 'codigo', 'nombre', 'descripcion', 'activa'];

const aEntidad = (f: FilaAccion) =>
  Accion.reconstruir({ id: f.id_accion, codigo: f.codigo, nombre: f.nombre, descripcion: f.descripcion, activa: f.activa });

/** Adaptador del puerto PuertoSalidaAccion con el ORM Sequelize. */
export class AdapSalida_AccionSequelize extends PuertoSalidaAccion {
  constructor(private readonly ctx: ContextoOrm) {
    super();
  }

  async listar(opciones: { soloActivas?: boolean } = {}): Promise<Accion[]> {
    return orm(async () => {
      const filas = (await this.ctx.modelos.Accion.findAll({
        attributes: COLUMNAS,
        where: opciones.soloActivas ? { activa: true } : {},
        order: [['id_accion', 'ASC']],
        raw: true,
        transaction: this.ctx.transaccion,
      })) as unknown as FilaAccion[];
      return filas.map(aEntidad);
    });
  }

  async buscarPorId(id: number): Promise<Accion | null> {
    return orm(async () => {
      const fila = (await this.ctx.modelos.Accion.findByPk(id, { attributes: COLUMNAS, raw: true, transaction: this.ctx.transaccion })) as FilaAccion | null;
      return fila ? aEntidad(fila) : null;
    });
  }

  async buscarPorCodigo(codigo: string): Promise<Accion | null> {
    return orm(async () => {
      const fila = (await this.ctx.modelos.Accion.findOne({ attributes: COLUMNAS, where: { codigo }, raw: true, transaction: this.ctx.transaccion })) as FilaAccion | null;
      return fila ? aEntidad(fila) : null;
    });
  }

  async crear(nueva: NuevaAccion): Promise<Accion> {
    return orm(async () => {
      const modelo = await this.ctx.modelos.Accion.create(
        { codigo: nueva.codigo, nombre: nueva.nombre, descripcion: nueva.descripcion },
        { returning: COLUMNAS, transaction: this.ctx.transaccion },
      );
      return aEntidad(modelo.get({ plain: true }) as FilaAccion);
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
