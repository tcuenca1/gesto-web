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

/** Columnas que se piden siempre: nunca SELECT *. */
const COLUMNAS = ['id_gesto', 'codigo', 'nombre', 'descripcion', 'umbral_confianza', 'id_accion_predeterminada', 'activo'];

const aEntidad = (f: FilaGesto) =>
  Gesto.reconstruir({
    id: f.id_gesto,
    codigo: f.codigo,
    nombre: f.nombre,
    descripcion: f.descripcion,
    umbralConfianza: Number(f.umbral_confianza),
    idAccionPredeterminada: f.id_accion_predeterminada,
    activo: f.activo,
  });

/** Adaptador del puerto PuertoSalidaGesto con el ORM Sequelize. */
export class AdapSalida_GestoSequelize extends PuertoSalidaGesto {
  constructor(private readonly ctx: ContextoOrm) {
    super();
  }

  async listar(opciones: { soloActivos?: boolean } = {}): Promise<Gesto[]> {
    return orm(async () => {
      const filas = (await this.ctx.modelos.Gesto.findAll({
        attributes: COLUMNAS,
        where: opciones.soloActivos ? { activo: true } : {},
        order: [['id_gesto', 'ASC']],
        raw: true,
        transaction: this.ctx.transaccion,
      })) as unknown as FilaGesto[];
      return filas.map(aEntidad);
    });
  }

  async buscarPorId(id: number): Promise<Gesto | null> {
    return orm(async () => {
      const fila = (await this.ctx.modelos.Gesto.findByPk(id, { attributes: COLUMNAS, raw: true, transaction: this.ctx.transaccion })) as FilaGesto | null;
      return fila ? aEntidad(fila) : null;
    });
  }

  async buscarPorCodigo(codigo: string): Promise<Gesto | null> {
    return orm(async () => {
      const fila = (await this.ctx.modelos.Gesto.findOne({ attributes: COLUMNAS, where: { codigo }, raw: true, transaction: this.ctx.transaccion })) as FilaGesto | null;
      return fila ? aEntidad(fila) : null;
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
