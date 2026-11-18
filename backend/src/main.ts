/**
 * main.ts · Arranque del servidor.
 *
 * Lee la configuración, abre la conexión a PostgreSQL (con el ORM o con pg,
 * según REPOSITORIOS), pide los contenedores a contenedor/ y levanta Express.
 * Qué adaptador cumple cada puerto se decide en contenedor/index.ts, no aquí.
 */
import { crearApp } from './app';
import { componer, Conexiones } from './contenedor';
import { crearPool } from './infraestructura/base_dato/ConexionPostgresql';
import { crearSequelize } from './infraestructura/base_dato/ConexionSequelize';
import { leerConfiguracion } from './infraestructura/util/entorno';

async function iniciar(): Promise<void> {
  const config = leerConfiguracion();
  const conexiones: Conexiones = {};
  const opciones = { urlConexion: config.baseDatos.url, ssl: config.baseDatos.ssl };

  try {
    if (config.repositorios === 'orm') {
      conexiones.sequelize = crearSequelize(opciones);
      await conexiones.sequelize.query('SELECT 1 FROM gestos LIMIT 1');
    } else if (config.repositorios === 'postgres') {
      conexiones.pool = crearPool(opciones);
      await conexiones.pool.query('SELECT 1 FROM gestos LIMIT 1');
    } else {
      console.warn('[AVISO] Modo memoria: los datos se pierden al reiniciar el servidor.');
    }
  } catch (error) {
    console.error('[ERROR] No se pudo usar la base de datos PostgreSQL.');
    console.error('        Revisa DATABASE_URL en backend/.env y ejecuta "npm run db:crear".');
    console.error(`        Detalle: ${(error as Error).message}`);
    console.error('        Con REPOSITORIOS=memoria el backend funciona sin PostgreSQL.');
    process.exit(1);
  }

  const app = crearApp(componer(config, conexiones), {
    corsOrigenes: config.corsOrigenes,
    carpetaFrontend: config.carpetaFrontend,
  });

  const servidor = app.listen(config.puerto, () => {
    console.log(`[OK] GestoWeb API en http://localhost:${config.puerto}/api (repositorios: ${config.repositorios})`);
    if (config.carpetaFrontend) console.log(`     Sirviendo el frontend desde ${config.carpetaFrontend}`);
  });

  const apagar = () => {
    servidor.close(() => {
      const cierres = [conexiones.pool?.end(), conexiones.sequelize?.close()];
      void Promise.allSettled(cierres).finally(() => process.exit(0));
    });
  };
  process.on('SIGINT', apagar);
  process.on('SIGTERM', apagar);
}

if (require.main === module) {
  void iniciar();
}
