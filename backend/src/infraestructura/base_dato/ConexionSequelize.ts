import { QueryTypes, Sequelize, Transaction } from 'sequelize';
// Importar este módulo también registra cómo se leen las columnas TIMESTAMP
// (como UTC), NUMERIC y BIGINT: el ORM usa el mismo driver "pg".
import { OpcionesConexion, traducirErrorPg } from './ConexionPostgresql';
import { definirModelos, Modelos } from './ModelosSequelize';

/** Conexión del ORM Sequelize a PostgreSQL, con los modelos ya definidos. */
export function crearSequelize(opciones: OpcionesConexion): Sequelize {
  const sequelize = new Sequelize(opciones.urlConexion ?? '', {
    dialect: 'postgres',
    logging: false,
    timezone: '+00:00',
    pool: { max: 10 },
    dialectOptions: {
      ssl: opciones.ssl ? { rejectUnauthorized: false } : undefined,
    },
  });
  definirModelos(sequelize);
  return sequelize;
}

/** Los modelos de una conexión creada con crearSequelize. */
export function modelosDe(sequelize: Sequelize): Modelos {
  const m = sequelize.models;
  if (!m.Usuario) return definirModelos(sequelize);
  return {
    sequelize,
    Rol: m.Rol, Usuario: m.Usuario, Accion: m.Accion, Gesto: m.Gesto,
    Asignacion: m.Asignacion, Sesion: m.Sesion, Deteccion: m.Deteccion, Bitacora: m.Bitacora,
  };
}

/**
 * Lo que comparten los adaptadores AdapSalida_*Sequelize: los modelos y, si
 * están dentro de una unidad de trabajo, la transacción en curso.
 */
export interface ContextoOrm {
  modelos: Modelos;
  transaccion?: Transaction;
}

/** Traduce un error de Sequelize al error del dominio (igual que hace consultar() con pg). */
export function traducirErrorSequelize(error: unknown): unknown {
  const original = (error as { original?: unknown; parent?: unknown })?.original ?? (error as { parent?: unknown })?.parent;
  return traducirErrorPg(original ?? error);
}

/** Ejecuta una operación del ORM y convierte sus errores en errores del dominio. */
export async function orm<T>(trabajo: () => Promise<T>): Promise<T> {
  try {
    return await trabajo();
  } catch (error) {
    throw traducirErrorSequelize(error);
  }
}

/** Consulta SQL con parámetros ($1, $2…) para vistas, funciones y reportes que no son un modelo. */
export function consultarOrm<R extends object>(ctx: ContextoOrm, sql: string, valores: unknown[] = []): Promise<R[]> {
  return orm(() =>
    ctx.modelos.sequelize.query(sql, {
      bind: valores as never[],
      type: QueryTypes.SELECT,
      transaction: ctx.transaccion,
    }) as Promise<R[]>,
  );
}

/** Ejecuta una instrucción SQL sin leer filas (UPDATE, CALL…). */
export function ejecutarOrm(ctx: ContextoOrm, sql: string, valores: unknown[] = []): Promise<void> {
  return orm(async () => {
    await ctx.modelos.sequelize.query(sql, { bind: valores as never[], type: QueryTypes.RAW, transaction: ctx.transaccion });
  });
}
