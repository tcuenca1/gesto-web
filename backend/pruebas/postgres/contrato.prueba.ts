/**
 * P-09 · Prueba de la arquitectura hexagonal.
 *
 * Las MISMAS pruebas se ejecutan dos veces: una con los adaptadores
 * PostgreSQL y otra con los adaptadores en memoria. El núcleo (dominio y
 * contenedores de uso) no cambia en absoluto; solo cambia qué adaptador se conecta
 * a cada puerto, exactamente como hace contenedor/. Si ambas pasan, los
 * adaptadores son intercambiables (principio de sustitución de Liskov).
 */
import { Pool } from 'pg';
import { Contenedores, crearContenedores } from '../../src/contenedor';
import { AdapSalida_CifradorBcrypt } from '../../src/infraestructura/adaptadores/salida/AdapSalida_CifradorBcrypt';
import { AdapSalida_TokensJwt } from '../../src/infraestructura/adaptadores/salida/AdapSalida_TokensJwt';
import { crearPersistenciaMemoria, crearPersistenciaPostgres } from '../../src/contenedor/ContenedorPersistencia';
import { ADMIN, RelojFalso, SECRETO_PRUEBAS } from '../ayudantes';
import { poolDePruebas, reiniciarBase } from './preparar';

let pool: Pool;
beforeAll(async () => {
  pool = await poolDePruebas();
});
afterAll(() => pool.end());

type Fabrica = (reloj: RelojFalso) => Promise<Contenedores>;

const fabricas: Array<[string, Fabrica]> = [
  ['memoria', async (reloj) => armar(crearPersistenciaMemoria(reloj), reloj)],
  [
    'postgres',
    async (reloj) => {
      await reiniciarBase(pool);
      return armar(crearPersistenciaPostgres(pool), reloj);
    },
  ],
];

function armar(persistencia: ReturnType<typeof crearPersistenciaMemoria>, reloj: RelojFalso): Contenedores {
  return crearContenedores({
    ...persistencia,
    cifrador: new AdapSalida_CifradorBcrypt(4),
    tokens: new AdapSalida_TokensJwt(SECRETO_PRUEBAS),
    reloj,
    zonaHoraria: 'America/Guayaquil',
  });
}

describe.each(fabricas)('Núcleo con adaptadores de %s', (_nombre, fabrica) => {
  let contenedores: Contenedores;
  let reloj: RelojFalso;

  beforeEach(async () => {
    // Hora de hoy para que coincida con el NOW() de PostgreSQL en las sesiones.
    reloj = new RelojFalso(new Date());
    contenedores = await fabrica(reloj);
  });

  it('registro, login y perfil', async () => {
    const u = await contenedores.usuario.cuEscritura.registrarUsuario({ nombre: 'Terry', correo: 'Terry@X.com', contrasena: 'Clave1234' });
    await expect(contenedores.usuario.cuEscritura.registrarUsuario({ nombre: 'Otro', correo: 'terry@x.com', contrasena: 'Clave1234' }))
      .rejects.toMatchObject({ tipo: 'CONFLICTO' });
    const { token } = await contenedores.usuario.cuEscritura.iniciarSesion({ correo: 'terry@x.com', contrasena: 'Clave1234' });
    expect((await contenedores.usuario.cuLectura.autenticarSolicitud({ token })).id).toBe(u.id);
    expect((await contenedores.accion.cuLectura.obtenerAsignaciones({ idUsuario: u.id }))).toHaveLength(7);
  });

  it('CU-03 completo con historial y estadísticas', async () => {
    const { usuario } = await contenedores.usuario.cuEscritura.iniciarSesion(ADMIN);
    await contenedores.accion.cuEscritura.cambiarAsignacion({ idUsuario: usuario.id, idGesto: 4, idAccion: 7 });
    const s = await contenedores.reconocimiento.cuEscritura.abrirSesion({ idUsuario: usuario.id, navegador: 'jest' });
    for (const codigoGesto of ['Victory', 'Victory', 'Closed_Fist']) {
      await contenedores.reconocimiento.cuEscritura.registrarDeteccion({
        idUsuario: usuario.id, idSesion: s.id, codigoGesto, confianza: 0.9, mano: 'Derecha',
        fechaHora: new Date(Date.now() + 1000).toISOString(),
      });
    }
    const cerrada = await contenedores.reconocimiento.cuEscritura.cerrarSesion({ idUsuario: usuario.id, idSesion: s.id });
    expect(cerrada.totalDetecciones).toBe(3);
    await expect(contenedores.reconocimiento.cuEscritura.registrarDeteccion({
      idUsuario: usuario.id, idSesion: s.id, codigoGesto: 'Victory', confianza: 0.9, mano: 'Derecha',
    })).rejects.toMatchObject({ tipo: 'CONFLICTO' });

    const historial = await contenedores.historial.cuLectura.consultarHistorial({ idUsuario: usuario.id, gesto: 'Victory' });
    expect(historial.total).toBe(2);
    expect(historial.elementos[0].codigoAccion).toBe('CORAZON');

    const stats = await contenedores.historial.cuLectura.consultarEstadisticas({ idUsuario: usuario.id });
    expect(stats.totalDetecciones).toBe(3);
    expect(stats.gestoMasUsado?.codigo).toBe('Victory');
    expect(stats.usoPorDia.reduce((suma, d) => suma + d.total, 0)).toBe(3);
  });

  it('administración con bitácora y transacción que se deshace al fallar', async () => {
    const g = await contenedores.administracion.cuEscritura.editarGesto({ idAdministrador: 1, idGesto: 2, cambios: { umbralConfianza: 0.8 } });
    expect(g.umbralConfianza).toBe(0.8);
    await expect(contenedores.administracion.cuEscritura.gestionarAccion({ tipo: 'desactivar', idAdministrador: 1, idAccion: 8 }))
      .rejects.toMatchObject({ tipo: 'CONFLICTO' });
    const bitacora = await contenedores.administracion.cuLectura.consultarBitacora({});
    expect(bitacora.total).toBe(1); // el intento fallido no dejó rastro
    const generales = await contenedores.administracion.cuLectura.consultarEstadisticasGenerales({});
    expect(generales.usoPorGesto).toHaveLength(7);
  });
});
