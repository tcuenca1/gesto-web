import { Accion, NuevaAccion } from '../../../dominio/accion/Accion';
import { PuertoSalidaAccion } from '../../../aplicacion/puerto/salida/PuertoSalidaAccion';
import { consultar, Consultor } from '../../base_dato/ConexionPostgresql';

// ---------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------
interface FilaAccion {
  id_accion: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
}

const accionDesdeFila = (f: FilaAccion) =>
  Accion.reconstruir({ id: f.id_accion, codigo: f.codigo, nombre: f.nombre, descripcion: f.descripcion, activa: f.activa });

/** Adaptador PostgreSQL del puerto PuertoSalidaAccion. */
export class AdapSalida_AccionPostgres extends PuertoSalidaAccion {
  constructor(private readonly bd: Consultor) {
    super();
  }

  async listar(opciones: { soloActivas?: boolean } = {}): Promise<Accion[]> {
    const { rows } = await consultar<FilaAccion>(
      this.bd,
      `SELECT * FROM acciones ${opciones.soloActivas ? 'WHERE activa' : ''} ORDER BY id_accion`,
    );
    return rows.map(accionDesdeFila);
  }

  async buscarPorId(id: number): Promise<Accion | null> {
    const { rows } = await consultar<FilaAccion>(this.bd, 'SELECT * FROM acciones WHERE id_accion = $1', [id]);
    return rows[0] ? accionDesdeFila(rows[0]) : null;
  }

  async buscarPorCodigo(codigo: string): Promise<Accion | null> {
    const { rows } = await consultar<FilaAccion>(this.bd, 'SELECT * FROM acciones WHERE codigo = $1', [codigo]);
    return rows[0] ? accionDesdeFila(rows[0]) : null;
  }

  async crear(nueva: NuevaAccion): Promise<Accion> {
    const { rows } = await consultar<FilaAccion>(
      this.bd,
      'INSERT INTO acciones (codigo, nombre, descripcion) VALUES ($1, $2, $3) RETURNING *',
      [nueva.codigo, nueva.nombre, nueva.descripcion],
    );
    return accionDesdeFila(rows[0]);
  }

  async actualizar(accion: Accion): Promise<void> {
    await consultar(
      this.bd,
      'UPDATE acciones SET nombre = $2, descripcion = $3, activa = $4 WHERE id_accion = $1',
      [accion.id, accion.nombre, accion.descripcion, accion.activa],
    );
  }

  async esPredeterminadaDeAlgunGesto(idAccion: number): Promise<boolean> {
    const { rows } = await consultar<{ existe: boolean }>(
      this.bd,
      'SELECT EXISTS (SELECT 1 FROM gestos WHERE id_accion_predeterminada = $1) AS existe',
      [idAccion],
    );
    return rows[0].existe;
  }
}
