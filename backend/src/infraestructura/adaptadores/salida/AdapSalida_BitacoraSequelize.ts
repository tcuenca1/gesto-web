import { PuertoSalidaBitacora, EntradaBitacora, NuevaEntradaBitacora, OperacionBitacora } from '../../../aplicacion/puerto/salida/PuertoSalidaBitacora';
import { ContextoOrm, orm } from '../../base_dato/ConexionSequelize';

interface FilaBitacora {
  id_bitacora: number;
  id_usuario: number;
  tabla_afectada: string;
  operacion: OperacionBitacora;
  detalle: EntradaBitacora['detalle'];
  fecha_hora: Date;
  usuario: { nombre: string };
}

const aEntrada = (f: FilaBitacora): EntradaBitacora => ({
  id: Number(f.id_bitacora),
  idUsuario: f.id_usuario,
  nombreUsuario: f.usuario.nombre,
  tablaAfectada: f.tabla_afectada,
  operacion: f.operacion,
  detalle: f.detalle,
  fechaHora: f.fecha_hora,
});

/** Adaptador del puerto PuertoSalidaBitacora con el ORM Sequelize. */
export class AdapSalida_BitacoraSequelize extends PuertoSalidaBitacora {
  constructor(private readonly ctx: ContextoOrm) {
    super();
  }

  async registrar(entrada: NuevaEntradaBitacora): Promise<void> {
    await orm(() =>
      this.ctx.modelos.Bitacora.create(
        {
          id_usuario: entrada.idUsuario,
          tabla_afectada: entrada.tablaAfectada,
          operacion: entrada.operacion,
          detalle: entrada.detalle ?? null,
        },
        { transaction: this.ctx.transaccion },
      ),
    );
  }

  async listar(pagina: number, limite: number): Promise<{ elementos: EntradaBitacora[]; total: number }> {
    return orm(async () => {
      const { Bitacora, Usuario } = this.ctx.modelos;
      const [total, filas] = await Promise.all([
        Bitacora.count({ transaction: this.ctx.transaccion }),
        Bitacora.findAll({
          attributes: ['id_bitacora', 'id_usuario', 'tabla_afectada', 'operacion', 'detalle', 'fecha_hora'],
          include: [{ model: Usuario, as: 'usuario', attributes: ['nombre'] }],
          order: [['id_bitacora', 'DESC']],
          limit: limite,
          offset: (pagina - 1) * limite,
          raw: true,
          nest: true,
          transaction: this.ctx.transaccion,
        }),
      ]);
      return { total, elementos: (filas as unknown as FilaBitacora[]).map(aEntrada) };
    });
  }
}
