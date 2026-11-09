/**
 * Raíz de composición (SRS §8.1): el ÚNICO lugar que conoce a la vez los
 * casos de uso y los adaptadores concretos. Aquí se decide qué adaptador
 * cumple cada puerto:
 *
 *    PuertoSalidaUsuario  ← AdapSalida_UsuarioPostgres (o AdapSalida_UsuarioMemoria)
 *    PuertoSalidaCifrador ← AdapSalida_CifradorBcrypt
 *    PuertoSalidaTokens   ← AdapSalida_TokensJwt
 *    …
 *
 * Cambiar PostgreSQL por otra base de datos, o por memoria (prueba P-09),
 * se hace cambiando SOLO esta carpeta.
 */
import { Pool } from 'pg';
import { AdapSalida_CifradorBcrypt } from '../infraestructura/adaptadores/salida/AdapSalida_CifradorBcrypt';
import { AdapSalida_RelojSistema } from '../infraestructura/adaptadores/salida/AdapSalida_RelojSistema';
import { AdapSalida_TokensJwt } from '../infraestructura/adaptadores/salida/AdapSalida_TokensJwt';
import { Configuracion } from '../infraestructura/util/entorno';
import { crearContenedorAccion } from './ContenedorAccion';
import { crearContenedorAdministracion } from './ContenedorAdministracion';
import { crearContenedorHistorial } from './ContenedorHistorial';
import { crearPersistenciaMemoria, crearPersistenciaPostgres, PuertosDeSalida } from './ContenedorPersistencia';
import { crearContenedorReconocimiento } from './ContenedorReconocimiento';
import { crearContenedorUsuario } from './ContenedorUsuario';

/** Un contenedor por módulo: { cuLectura?, cuEscritura?, adap }. */
export function crearContenedores(p: PuertosDeSalida) {
  return {
    usuario: crearContenedorUsuario(p),
    reconocimiento: crearContenedorReconocimiento(p),
    accion: crearContenedorAccion(p),
    historial: crearContenedorHistorial(p),
    administracion: crearContenedorAdministracion(p),
  };
}

export type Contenedores = ReturnType<typeof crearContenedores>;

/** Elige los adaptadores según la configuración y arma todos los contenedores. */
export function componer(config: Configuracion, pool?: Pool): Contenedores {
  const reloj = new AdapSalida_RelojSistema();
  const persistencia = config.repositorios === 'memoria' ? crearPersistenciaMemoria(reloj) : crearPersistenciaPostgres(pool!);
  return crearContenedores({
    ...persistencia,
    cifrador: new AdapSalida_CifradorBcrypt(),
    tokens: new AdapSalida_TokensJwt(config.jwt.secreto, config.jwt.duracionSegundos),
    reloj,
    zonaHoraria: config.zonaHoraria,
  });
}
