import { Gesto } from '../../../dominio/gesto/Gesto';
import { PuertoSalidaGesto } from '../../../aplicacion/puerto/salida/PuertoSalidaGesto';
import { consultar, Consultor } from '../../base_dato/ConexionPostgresql';

// ---------------------------------------------------------------------
// Gestos
// ---------------------------------------------------------------------
interface FilaGesto {
  id_gesto: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  umbral_confianza: number;
  id_accion_predeterminada: number;
  activo: boolean;
}

const gestoDesdeFila = (f: FilaGesto) =>
  Gesto.reconstruir({
    id: f.id_gesto,
    codigo: f.codigo,
    nombre: f.nombre,
    descripcion: f.descripcion,
    umbralConfianza: f.umbral_confianza,
    idAccionPredeterminada: f.id_accion_predeterminada,
    activo: f.activo,
  });

/** Adaptador PostgreSQL del puerto PuertoSalidaGesto. */
export class AdapSalida_GestoPostgres extends PuertoSalidaGesto {
  constructor(private readonly bd: Consultor) {
    super();
  }

  async listar(opciones: { soloActivos?: boolean } = {}): Promise<Gesto[]> {
    const { rows } = await consultar<FilaGesto>(
      this.bd,
      `SELECT * FROM gestos ${opciones.soloActivos ? 'WHERE activo' : ''} ORDER BY id_gesto`,
    );
    return rows.map(gestoDesdeFila);
  }

  async buscarPorId(id: number): Promise<Gesto | null> {
    const { rows } = await consultar<FilaGesto>(this.bd, 'SELECT * FROM gestos WHERE id_gesto = $1', [id]);
    return rows[0] ? gestoDesdeFila(rows[0]) : null;
  }

  async buscarPorCodigo(codigo: string): Promise<Gesto | null> {
    const { rows } = await consultar<FilaGesto>(this.bd, 'SELECT * FROM gestos WHERE codigo = $1', [codigo]);
    return rows[0] ? gestoDesdeFila(rows[0]) : null;
  }

  async actualizar(gesto: Gesto): Promise<void> {
    await consultar(
      this.bd,
      `UPDATE gestos SET nombre = $2, descripcion = $3, umbral_confianza = $4, activo = $5 WHERE id_gesto = $1`,
      [gesto.id, gesto.nombre, gesto.descripcion, gesto.umbralConfianza, gesto.activo],
    );
  }
}
