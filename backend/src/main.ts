/**
 * main.ts · Raíz de composición (SRS §8.1).
 *
 * Es el ÚNICO lugar del sistema que conoce a la vez el núcleo y los
 * adaptadores concretos. Aquí se decide qué adaptador cumple cada puerto:
 *
 *    puerto PuertoSalidaUsuario  ← AdapSalida_UsuarioPostgres   (o …Memoria)
 *    puerto PuertoSalidaCifrador ← AdapSalida_CifradorBcrypt
 *    puerto PuertoSalidaTokens     ← AdapSalida_TokensJwt
 *    …
 *
 * Cambiar PostgreSQL por otra base de datos, o por memoria (prueba P-09),
 * se hace cambiando SOLO este archivo. Con la variable REPOSITORIOS=memoria
 * se prueba sin instalar PostgreSQL.
 */
import { Pool } from 'pg';
import { crearCasosDeUso, PuertosDeSalida } from './aplicacion/caso_uso';
import { CasosDeUso } from './aplicacion/caso_uso';
import { PuertoSalidaReloj } from './aplicacion/puerto/salida/PuertoSalidaReloj';
import { Configuracion, leerConfiguracion } from './config/entorno';
import { crearApp } from './infraestructura/http/app';
import { AlmacenMemoria } from './infraestructura/base_dato/AlmacenMemoria';
import { datosInicialesMemoria } from './infraestructura/base_dato/datosInicialesMemoria';
import { AdapSalida_AccionMemoria } from './infraestructura/adaptadores/salida/AdapSalida_AccionMemoria';
import { AdapSalida_AsignacionMemoria } from './infraestructura/adaptadores/salida/AdapSalida_AsignacionMemoria';
import { AdapSalida_BitacoraMemoria } from './infraestructura/adaptadores/salida/AdapSalida_BitacoraMemoria';
import { AdapSalida_DeteccionMemoria } from './infraestructura/adaptadores/salida/AdapSalida_DeteccionMemoria';
import { AdapSalida_GestoMemoria } from './infraestructura/adaptadores/salida/AdapSalida_GestoMemoria';
import { AdapSalida_SesionMemoria } from './infraestructura/adaptadores/salida/AdapSalida_SesionMemoria';
import { AdapSalida_UnidadDeTrabajoMemoria } from './infraestructura/adaptadores/salida/AdapSalida_UnidadDeTrabajoMemoria';
import { AdapSalida_UsuarioMemoria } from './infraestructura/adaptadores/salida/AdapSalida_UsuarioMemoria';
import { AdapSalida_BitacoraPostgres } from './infraestructura/adaptadores/salida/AdapSalida_BitacoraPostgres';
import { AdapSalida_UnidadDeTrabajoPostgres } from './infraestructura/adaptadores/salida/AdapSalida_UnidadDeTrabajoPostgres';
import { AdapSalida_AccionPostgres } from './infraestructura/adaptadores/salida/AdapSalida_AccionPostgres';
import { AdapSalida_AsignacionPostgres } from './infraestructura/adaptadores/salida/AdapSalida_AsignacionPostgres';
import { AdapSalida_GestoPostgres } from './infraestructura/adaptadores/salida/AdapSalida_GestoPostgres';
import { crearPool } from './infraestructura/base_dato/ConexionPostgresql';
import { AdapSalida_DeteccionPostgres } from './infraestructura/adaptadores/salida/AdapSalida_DeteccionPostgres';
import { AdapSalida_SesionPostgres } from './infraestructura/adaptadores/salida/AdapSalida_SesionPostgres';
import { AdapSalida_UsuarioPostgres } from './infraestructura/adaptadores/salida/AdapSalida_UsuarioPostgres';
import { AdapSalida_CifradorBcrypt } from './infraestructura/adaptadores/salida/AdapSalida_CifradorBcrypt';
import { AdapSalida_TokensJwt } from './infraestructura/adaptadores/salida/AdapSalida_TokensJwt';
import { AdapSalida_RelojSistema } from './infraestructura/adaptadores/salida/AdapSalida_RelojSistema';

type Persistencia = Pick<
  PuertosDeSalida,
  'usuarios' | 'gestos' | 'acciones' | 'asignaciones' | 'sesiones' | 'detecciones' | 'bitacora' | 'unidadDeTrabajo'
>;

/** Adaptadores PostgreSQL (versión 1 del sistema). */
export function persistenciaPostgres(pool: Pool): Persistencia {
  return {
    usuarios: new AdapSalida_UsuarioPostgres(pool),
    gestos: new AdapSalida_GestoPostgres(pool),
    acciones: new AdapSalida_AccionPostgres(pool),
    asignaciones: new AdapSalida_AsignacionPostgres(pool),
    sesiones: new AdapSalida_SesionPostgres(pool),
    detecciones: new AdapSalida_DeteccionPostgres(pool),
    bitacora: new AdapSalida_BitacoraPostgres(pool),
    unidadDeTrabajo: new AdapSalida_UnidadDeTrabajoPostgres(pool),
  };
}

/** Adaptadores en memoria (pruebas y prueba P-09). */
export function persistenciaMemoria(reloj: PuertoSalidaReloj, almacen = new AlmacenMemoria(datosInicialesMemoria(reloj.ahora()))): Persistencia {
  const usuarios = new AdapSalida_UsuarioMemoria(almacen, reloj);
  const gestos = new AdapSalida_GestoMemoria(almacen);
  const acciones = new AdapSalida_AccionMemoria(almacen);
  const bitacora = new AdapSalida_BitacoraMemoria(almacen, reloj);
  return {
    usuarios,
    gestos,
    acciones,
    bitacora,
    asignaciones: new AdapSalida_AsignacionMemoria(almacen, reloj),
    sesiones: new AdapSalida_SesionMemoria(almacen, reloj),
    detecciones: new AdapSalida_DeteccionMemoria(almacen),
    unidadDeTrabajo: new AdapSalida_UnidadDeTrabajoMemoria(almacen, { usuarios, gestos, acciones, bitacora }),
  };
}

/** Conecta cada puerto con su adaptador y devuelve los casos de uso listos. */
export function componer(config: Configuracion, pool?: Pool): CasosDeUso {
  const reloj = new AdapSalida_RelojSistema();
  const persistencia = config.repositorios === 'memoria' ? persistenciaMemoria(reloj) : persistenciaPostgres(pool!);
  return crearCasosDeUso({
    ...persistencia,
    cifrador: new AdapSalida_CifradorBcrypt(),
    tokens: new AdapSalida_TokensJwt(config.jwt.secreto, config.jwt.duracionSegundos),
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
