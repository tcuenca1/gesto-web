/**
 * npm run db:crear
 *
 * Crea la base de datos (si no existe) y ejecuta en orden los scripts de
 * ../base-datos: tablas, funciones y triggers, vistas y datos iniciales.
 * No necesita tener "psql" instalado: usa la misma librería pg del backend.
 *
 * ¡Ojo! 01_tablas.sql borra las tablas existentes: se pierden los datos.
 */
import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';
import { leerConfiguracion } from '../src/config/entorno';

async function main(): Promise<void> {
  const { baseDatos } = leerConfiguracion();
  const url = new URL(baseDatos.url);
  const nombreBase = decodeURIComponent(url.pathname.slice(1));
  if (!/^[A-Za-z0-9_]+$/.test(nombreBase)) throw new Error(`Nombre de base de datos no válido: ${nombreBase}`);
  const ssl = baseDatos.ssl ? { rejectUnauthorized: false } : undefined;

  // 1. Crear la base de datos si no existe (conectándose a "postgres").
  const urlAdmin = new URL(baseDatos.url);
  urlAdmin.pathname = '/postgres';
  const admin = new Client({ connectionString: urlAdmin.toString(), ssl });
  try {
    await admin.connect();
    const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [nombreBase]);
    if (!rowCount) {
      await admin.query(`CREATE DATABASE ${nombreBase} ENCODING 'UTF8'`);
      console.log(`✔ Base de datos "${nombreBase}" creada`);
    }
  } catch (error) {
    // En la nube a veces no hay permiso para crear bases: se asume que ya existe.
    console.warn(`⚠ No se pudo comprobar/crear la base (${(error as Error).message}). Se intentará usarla igual.`);
  } finally {
    await admin.end().catch(() => undefined);
  }

  // 2. Ejecutar los scripts en orden.
  const carpeta = path.resolve(__dirname, '../../base-datos');
  const archivos = fs.readdirSync(carpeta).filter((f) => /^\d{2}_.*\.sql$/.test(f)).sort();
  const cliente = new Client({ connectionString: baseDatos.url, ssl });
  await cliente.connect();
  await cliente.query('SET client_min_messages TO WARNING');
  try {
    for (const archivo of archivos) {
      await cliente.query(fs.readFileSync(path.join(carpeta, archivo), 'utf8'));
      console.log(`✔ ${archivo}`);
    }
    console.log('Listo. Administrador de prueba: admin@gestoweb.local / Admin123!');
  } finally {
    await cliente.end();
  }
}

main().catch((error) => {
  console.error('✖ Error al crear la base de datos:', (error as Error).message);
  process.exit(1);
});
