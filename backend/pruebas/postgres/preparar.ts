import fs from 'node:fs';
import path from 'node:path';
import { Client, Pool } from 'pg';
import { crearPool } from '../../src/infraestructura/persistencia/postgres/conexion';

/**
 * Las pruebas con PostgreSQL usan una base aparte ("gestoweb_pruebas") para
 * no tocar los datos de desarrollo. Se puede cambiar con DATABASE_URL_PRUEBAS.
 */
export const URL_PRUEBAS =
  process.env.DATABASE_URL_PRUEBAS ?? 'postgres://postgres:postgres@localhost:5432/gestoweb_pruebas';

const CARPETA_SQL = path.resolve(__dirname, '../../../base-datos');

export async function crearBaseDePruebas(): Promise<void> {
  const url = new URL(URL_PRUEBAS);
  const nombre = url.pathname.slice(1);
  url.pathname = '/postgres';
  const admin = new Client({ connectionString: url.toString() });
  await admin.connect();
  const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [nombre]);
  if (!rowCount) await admin.query(`CREATE DATABASE ${nombre}`);
  await admin.end();
}

/** Borra todo y vuelve a ejecutar los 4 scripts de base-datos/. */
export async function reiniciarBase(pool: Pool): Promise<void> {
  const cliente = await pool.connect();
  try {
    await cliente.query('SET client_min_messages TO WARNING');
    for (const archivo of fs.readdirSync(CARPETA_SQL).filter((f) => f.endsWith('.sql')).sort()) {
      await cliente.query(fs.readFileSync(path.join(CARPETA_SQL, archivo), 'utf8'));
    }
  } finally {
    cliente.release();
  }
}

export async function poolDePruebas(): Promise<Pool> {
  await crearBaseDePruebas();
  const pool = crearPool({ urlConexion: URL_PRUEBAS });
  await reiniciarBase(pool);
  return pool;
}
