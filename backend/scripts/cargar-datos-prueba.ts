/**
 * npm run db:datos-prueba [cantidad]
 *
 * Carga muchas detecciones falsas y mide cuánto tardan las consultas de
 * historial y estadísticas (RNF-04: menos de medio segundo).
 * Crea el usuario "carga@gestoweb.local" (contraseña Carga1234) con sus datos.
 */
import { performance } from 'node:perf_hooks';
import { leerConfiguracion } from '../src/config/entorno';
import { crearPool } from '../src/infraestructura/persistencia/postgres/conexion';
import { DeteccionRepositorioPg } from '../src/infraestructura/persistencia/postgres/ReconocimientoRepositoriosPg';
import { CifradorBcrypt } from '../src/infraestructura/seguridad/CifradorBcrypt';

async function medir<T>(nombre: string, fn: () => Promise<T>): Promise<number> {
  await fn(); // calentamiento
  const inicio = performance.now();
  await fn();
  const ms = performance.now() - inicio;
  console.log(`  ${ms < 500 ? '✔' : '✖'} ${nombre.padEnd(40)} ${ms.toFixed(1)} ms`);
  return ms;
}

async function main(): Promise<void> {
  const cantidad = Number(process.argv[2] ?? 100000);
  const config = leerConfiguracion();
  const pool = crearPool({ urlConexion: config.baseDatos.url, ssl: config.baseDatos.ssl });

  try {
    const hash = await new CifradorBcrypt().cifrar('Carga1234');
    const { rows } = await pool.query<{ id_usuario: number }>(
      `INSERT INTO usuarios (nombre, correo, contrasena_hash) VALUES ('Usuario de carga', 'carga@gestoweb.local', $1)
       ON CONFLICT (correo) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id_usuario`,
      [hash],
    );
    const idUsuario = rows[0].id_usuario;

    console.log(`Cargando ${cantidad.toLocaleString('es')} detecciones en 100 sesiones…`);
    const inicioCarga = performance.now();
    const cliente = await pool.connect();
    try {
      await cliente.query('BEGIN');
      // 100 sesiones repartidas en los últimos 60 días, abiertas mientras se cargan.
      await cliente.query(
        `INSERT INTO sesiones_reconocimiento (id_usuario, fecha_inicio, navegador)
         SELECT $1, (NOW() AT TIME ZONE 'UTC') - (s * INTERVAL '14 hours') - INTERVAL '1 hour', 'carga de prueba'
           FROM generate_series(1, 100) s`,
        [idUsuario],
      );
      await cliente.query(
        `INSERT INTO detecciones (id_sesion, id_gesto, id_accion, confianza, mano, fecha_hora)
         SELECT s.id_sesion,
                g.id_gesto,
                g.id_accion_predeterminada,
                ROUND((0.70 + random() * 0.30)::numeric, 3),
                CASE WHEN random() < 0.7 THEN 'Derecha' ELSE 'Izquierda' END,
                s.fecha_inicio + (n % 3000) * INTERVAL '1 second'
           FROM generate_series(1, $2::int) n
           JOIN LATERAL (SELECT id_sesion, fecha_inicio FROM sesiones_reconocimiento
                          WHERE id_usuario = $1 AND fecha_fin IS NULL
                          ORDER BY id_sesion OFFSET (n % 100) LIMIT 1) s ON TRUE
           JOIN gestos g ON g.id_gesto = 1 + (n % 7)`,
        [idUsuario, cantidad],
      );
      await cliente.query(
        `UPDATE sesiones_reconocimiento SET fecha_fin = fecha_inicio + INTERVAL '1 hour'
          WHERE id_usuario = $1 AND fecha_fin IS NULL`,
        [idUsuario],
      );
      await cliente.query('COMMIT');
    } catch (error) {
      await cliente.query('ROLLBACK');
      throw error;
    } finally {
      cliente.release();
    }
    await pool.query('ANALYZE');
    console.log(`  carga terminada en ${((performance.now() - inicioCarga) / 1000).toFixed(1)} s`);

    const total = (await pool.query<{ total: number }>('SELECT COUNT(*) AS total FROM detecciones')).rows[0].total;
    console.log(`\nTiempos de consulta con ${total.toLocaleString('es')} detecciones en total (RNF-04, meta < 500 ms):`);
    const repo = new DeteccionRepositorioPg(pool);
    const hace30 = new Date(Date.now() - 30 * 86400000);
    const tiempos = [
      await medir('Historial, página 1 (20 filas)', () => repo.historial({ idUsuario, pagina: 1, limite: 20 })),
      await medir('Historial filtrado por gesto y fechas', () => repo.historial({ idUsuario, idGesto: 3, desde: hace30, pagina: 1, limite: 20 })),
      await medir('Historial, página 200', () => repo.historial({ idUsuario, pagina: 200, limite: 20 })),
      await medir('Totales por gesto (fn_estadisticas_usuario)', () => repo.totalesPorGesto(idUsuario, {})),
      await medir('Uso por día, últimos 30 días', () => repo.usoPorDia(idUsuario, { desde: hace30 }, config.zonaHoraria)),
      await medir('Uso general (v_estadisticas_generales)', () => repo.usoGeneral()),
    ];
    console.log(tiempos.every((t) => t < 500) ? '\nRNF-04 cumplido.' : '\nAlguna consulta supera los 500 ms.');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('✖', (error as Error).message);
  process.exit(1);
});
