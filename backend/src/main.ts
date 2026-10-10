/**
 * main.ts · Raíz de composición (SRS §8.1).
 *
 * Es el ÚNICO lugar del sistema que conoce a la vez el núcleo y los
 * adaptadores concretos. Aquí se decide qué adaptador cumple cada puerto:
 *
 *    puerto UsuarioRepositorio  ← UsuarioRepositorioPg   (o …Memoria)
 *    puerto CifradorContrasenas ← CifradorBcrypt
 *    puerto GeneradorTokens     ← GeneradorTokensJwt
 *    …
 *
 * Cambiar PostgreSQL por otra base de datos, o por memoria (prueba P-09),
 * se hace cambiando SOLO este archivo. Con la variable REPOSITORIOS=memoria
 * se prueba sin instalar PostgreSQL.
 */
import { Pool } from 'pg';
import { crearCasosDeUso, PuertosDeSalida } from './aplicacion/casos-uso';
import { CasosDeUso } from './aplicacion/puertos/entrada';
import { Reloj } from './aplicacion/puertos/salida/servicios';
import { Configuracion, leerConfiguracion } from './config/entorno';
import { crearApp } from './infraestructura/http/app';
import { AlmacenMemoria } from './infraestructura/persistencia/memoria/AlmacenMemoria';
import { datosInicialesMemoria } from './infraestructura/persistencia/memoria/datosIniciales';
import {
  AccionRepositorioMemoria,
  AsignacionRepositorioMemoria,
  BitacoraRepositorioMemoria,
  DeteccionRepositorioMemoria,
  GestoRepositorioMemoria,
  SesionRepositorioMemoria,
  UnidadDeTrabajoMemoria,
  UsuarioRepositorioMemoria,
} from './infraestructura/persistencia/memoria/RepositoriosMemoria';
import { BitacoraRepositorioPg, UnidadDeTrabajoPg } from './infraestructura/persistencia/postgres/BitacoraYTransaccionPg';
import {
  AccionRepositorioPg,
  AsignacionRepositorioPg,
  GestoRepositorioPg,
} from './infraestructura/persistencia/postgres/CatalogoRepositoriosPg';
import { crearPool } from './infraestructura/persistencia/postgres/conexion';
import { DeteccionRepositorioPg, SesionRepositorioPg } from './infraestructura/persistencia/postgres/ReconocimientoRepositoriosPg';
import { UsuarioRepositorioPg } from './infraestructura/persistencia/postgres/UsuarioRepositorioPg';
import { CifradorBcrypt } from './infraestructura/seguridad/CifradorBcrypt';
import { GeneradorTokensJwt } from './infraestructura/seguridad/GeneradorTokensJwt';
import { RelojSistema } from './infraestructura/sistema/RelojSistema';

type Persistencia = Pick<
  PuertosDeSalida,
  'usuarios' | 'gestos' | 'acciones' | 'asignaciones' | 'sesiones' | 'detecciones' | 'bitacora' | 'unidadDeTrabajo'
>;

/** Adaptadores PostgreSQL (versión 1 del sistema). */
export function persistenciaPostgres(pool: Pool): Persistencia {
  return {
    usuarios: new UsuarioRepositorioPg(pool),
    gestos: new GestoRepositorioPg(pool),
    acciones: new AccionRepositorioPg(pool),
    asignaciones: new AsignacionRepositorioPg(pool),
    sesiones: new SesionRepositorioPg(pool),
    detecciones: new DeteccionRepositorioPg(pool),
    bitacora: new BitacoraRepositorioPg(pool),
    unidadDeTrabajo: new UnidadDeTrabajoPg(pool),
  };
}

/** Adaptadores en memoria (pruebas y prueba P-09). */
export function persistenciaMemoria(reloj: Reloj, almacen = new AlmacenMemoria(datosInicialesMemoria(reloj.ahora()))): Persistencia {
  const usuarios = new UsuarioRepositorioMemoria(almacen, reloj);
  const gestos = new GestoRepositorioMemoria(almacen);
  const acciones = new AccionRepositorioMemoria(almacen);
  const bitacora = new BitacoraRepositorioMemoria(almacen, reloj);
  return {
    usuarios,
    gestos,
    acciones,
    bitacora,
    asignaciones: new AsignacionRepositorioMemoria(almacen, reloj),
    sesiones: new SesionRepositorioMemoria(almacen, reloj),
    detecciones: new DeteccionRepositorioMemoria(almacen),
    unidadDeTrabajo: new UnidadDeTrabajoMemoria(almacen, { usuarios, gestos, acciones, bitacora }),
  };
}

/** Conecta cada puerto con su adaptador y devuelve los casos de uso listos. */
export function componer(config: Configuracion, pool?: Pool): CasosDeUso {
  const reloj = new RelojSistema();
  const persistencia = config.repositorios === 'memoria' ? persistenciaMemoria(reloj) : persistenciaPostgres(pool!);
  return crearCasosDeUso({
    ...persistencia,
    cifrador: new CifradorBcrypt(),
    tokens: new GeneradorTokensJwt(config.jwt.secreto, config.jwt.duracionSegundos),
    reloj,
    zonaHoraria: config.zonaHoraria,
  });
}

async function iniciar(): Promise<void> {
  const config = leerConfiguracion();
  let pool: Pool | undefined;

  if (config.repositorios === 'postgres') {
    pool = crearPool({ urlConexion: config.baseDatos.url, ssl: config.baseDatos.ssl });
    try {
      await pool.query('SELECT 1 FROM gestos LIMIT 1');
    } catch (error) {
      console.error('✖ No se pudo usar la base de datos PostgreSQL.');
      console.error('  Revisa DATABASE_URL en backend/.env y ejecuta "npm run db:crear".');
      console.error(`  Detalle: ${(error as Error).message}`);
      console.error('  Consejo: con REPOSITORIOS=memoria el backend funciona sin PostgreSQL.');
      process.exit(1);
    }
  } else {
    console.warn('⚠ Modo memoria: los datos se pierden al reiniciar el servidor.');
  }

  const app = crearApp(componer(config, pool), {
    corsOrigenes: config.corsOrigenes,
    carpetaFrontend: config.carpetaFrontend,
  });

  const servidor = app.listen(config.puerto, () => {
    console.log(`✔ GestoWeb API escuchando en http://localhost:${config.puerto}/api (repositorios: ${config.repositorios})`);
    if (config.carpetaFrontend) console.log(`  Sirviendo el frontend desde ${config.carpetaFrontend}`);
  });

  const apagar = () => {
    servidor.close(() => void pool?.end().finally(() => process.exit(0)));
  };
  process.on('SIGINT', apagar);
  process.on('SIGTERM', apagar);
}

if (require.main === module) {
  void iniciar();
}
