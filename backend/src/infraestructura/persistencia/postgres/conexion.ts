import { Pool, PoolConfig, QueryResult, QueryResultRow, types, defaults } from 'pg';
import { ErrorConflicto, ErrorValidacion } from '../../../dominio/compartido/errores';

/**
 * Las columnas TIMESTAMP de GestoWeb guardan la hora en UTC.
 *  - Al leer: interpretamos el texto como UTC (por defecto pg usaría la hora local).
 *  - Al escribir: pg envía las fechas de JavaScript en UTC.
 * Así no importa en qué zona horaria esté el servidor.
 */
types.setTypeParser(1114, (texto: string) => new Date(texto.replace(' ', 'T') + 'Z')); // TIMESTAMP
types.setTypeParser(1700, (texto: string) => parseFloat(texto)); // NUMERIC → number
types.setTypeParser(20, (texto: string) => parseInt(texto, 10)); // BIGINT (COUNT, BIGSERIAL) → number
defaults.parseInputDatesAsUTC = true;

/** Lo mínimo que necesita un repositorio: algo que ejecute consultas (un Pool o un cliente en transacción). */
export interface Consultor {
  query<R extends QueryResultRow = QueryResultRow>(texto: string, valores?: unknown[]): Promise<QueryResult<R>>;
}

export interface OpcionesConexion {
  urlConexion?: string;
  ssl?: boolean;
}

export function crearPool(opciones: OpcionesConexion): Pool {
  const config: PoolConfig = {
    connectionString: opciones.urlConexion,
    ssl: opciones.ssl ? { rejectUnauthorized: false } : undefined,
    max: 10,
    options: '-c timezone=UTC',
  };
  return new Pool(config);
}

/**
 * Ejecuta una consulta y traduce los errores de PostgreSQL a errores del
 * dominio. El núcleo nunca ve un código como 23505: ve un ErrorConflicto.
 */
export async function consultar<R extends QueryResultRow = QueryResultRow>(
  consultor: Consultor,
  texto: string,
  valores: unknown[] = [],
): Promise<QueryResult<R>> {
  try {
    return await consultor.query<R>(texto, valores);
  } catch (error) {
    throw traducirErrorPg(error);
  }
}

export function traducirErrorPg(error: unknown): unknown {
  const e = error as { code?: string; message?: string; detail?: string };
  switch (e?.code) {
    case 'GW001': // trigger trg_validar_sesion_abierta
      return new ErrorConflicto('La sesión de reconocimiento ya está cerrada', 'SESION_CERRADA');
    case '23505': // unique_violation
      return new ErrorConflicto('Ya existe un registro con esos datos');
    case '23503': // foreign_key_violation
      return new ErrorValidacion('Se hace referencia a un registro que no existe');
    case '23514': // check_violation
    case '22P02': // invalid_text_representation
      return new ErrorValidacion('Algún dato no cumple las reglas de la base de datos');
    default:
      return error;
  }
}
