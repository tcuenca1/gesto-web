import { Accion, NuevaAccion } from '../../../dominio/accion/Accion';
import { Asignacion } from '../../../dominio/accion/Asignacion';
import { Gesto } from '../../../dominio/gesto/Gesto';
import { AccionRepositorio } from '../../../aplicacion/puertos/salida/AccionRepositorio';
import { AsignacionRepositorio } from '../../../aplicacion/puertos/salida/AsignacionRepositorio';
import { GestoRepositorio } from '../../../aplicacion/puertos/salida/GestoRepositorio';
import { consultar, Consultor } from './conexion';

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

/** Adaptador PostgreSQL del puerto GestoRepositorio. */
export class GestoRepositorioPg implements GestoRepositorio {
  constructor(private readonly bd: Consultor) {}

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

/** Adaptador PostgreSQL del puerto AccionRepositorio. */
export class AccionRepositorioPg implements AccionRepositorio {
  constructor(private readonly bd: Consultor) {}

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

// ---------------------------------------------------------------------
// Asignaciones
// ---------------------------------------------------------------------
interface FilaAsignacion {
  id_usuario: number;
  id_gesto: number;
  id_accion: number;
  fecha_actualizacion: Date;
}

const asignacionDesdeFila = (f: FilaAsignacion): Asignacion => ({
  idUsuario: f.id_usuario,
  idGesto: f.id_gesto,
  idAccion: f.id_accion,
  fechaActualizacion: f.fecha_actualizacion,
});

/** Adaptador PostgreSQL del puerto AsignacionRepositorio. */
export class AsignacionRepositorioPg implements AsignacionRepositorio {
  constructor(private readonly bd: Consultor) {}

  async listarDeUsuario(idUsuario: number): Promise<Asignacion[]> {
    const { rows } = await consultar<FilaAsignacion>(
      this.bd,
      'SELECT id_usuario, id_gesto, id_accion, fecha_actualizacion FROM asignaciones WHERE id_usuario = $1 ORDER BY id_gesto',
      [idUsuario],
    );
    return rows.map(asignacionDesdeFila);
  }

  async guardar(idUsuario: number, idGesto: number, idAccion: number): Promise<Asignacion> {
    const { rows } = await consultar<FilaAsignacion>(
      this.bd,
      `INSERT INTO asignaciones (id_usuario, id_gesto, id_accion) VALUES ($1, $2, $3)
       ON CONFLICT (id_usuario, id_gesto) DO UPDATE SET id_accion = EXCLUDED.id_accion
       RETURNING id_usuario, id_gesto, id_accion, fecha_actualizacion`,
      [idUsuario, idGesto, idAccion],
    );
    return asignacionDesdeFila(rows[0]);
  }

  async restaurar(idUsuario: number): Promise<void> {
    await consultar(this.bd, 'CALL sp_restaurar_asignaciones($1)', [idUsuario]);
  }
}
