import { PuertoSalidaBitacora, EntradaBitacora, NuevaEntradaBitacora, OperacionBitacora } from '../../../aplicacion/puerto/salida/PuertoSalidaBitacora';
import { consultar, Consultor } from '../../base_dato/ConexionPostgresql';

/** Adaptador PostgreSQL del puerto PuertoSalidaBitacora. */
export class AdapSalida_BitacoraPostgres extends PuertoSalidaBitacora {
  constructor(private readonly bd: Consultor) {
    super();
  }

  async registrar(entrada: NuevaEntradaBitacora): Promise<void> {
    await consultar(
      this.bd,
      'INSERT INTO bitacora (id_usuario, tabla_afectada, operacion, detalle) VALUES ($1, $2, $3, $4::jsonb)',
      [entrada.idUsuario, entrada.tablaAfectada, entrada.operacion, entrada.detalle ? JSON.stringify(entrada.detalle) : null],
    );
  }

  async listar(pagina: number, limite: number): Promise<{ elementos: EntradaBitacora[]; total: number }> {
    const [conteo, filas] = await Promise.all([
      consultar<{ total: number }>(this.bd, 'SELECT COUNT(*) AS total FROM bitacora'),
      consultar<{
        id_bitacora: number; id_usuario: number; nombre_usuario: string; tabla_afectada: string;
        operacion: OperacionBitacora; detalle: EntradaBitacora['detalle']; fecha_hora: Date;
      }>(
        this.bd,
        `SELECT b.*, u.nombre AS nombre_usuario
           FROM bitacora b JOIN usuarios u ON u.id_usuario = b.id_usuario
          ORDER BY b.id_bitacora DESC LIMIT $1 OFFSET $2`,
        [limite, (pagina - 1) * limite],
      ),
    ]);
    return {
      total: conteo.rows[0].total,
      elementos: filas.rows.map((f) => ({
        id: f.id_bitacora,
        idUsuario: f.id_usuario,
        nombreUsuario: f.nombre_usuario,
        tablaAfectada: f.tabla_afectada,
        operacion: f.operacion,
        detalle: f.detalle,
        fechaHora: f.fecha_hora,
      })),
    };
  }
}
