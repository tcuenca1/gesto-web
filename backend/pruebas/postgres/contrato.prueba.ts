/**
 * P-09 · Prueba de la arquitectura hexagonal.
 *
 * Las MISMAS pruebas se ejecutan dos veces: una con los adaptadores
 * PostgreSQL y otra con los adaptadores en memoria. El núcleo (dominio y
 * casos de uso) no cambia en absoluto; solo cambia qué adaptador se conecta
 * a cada puerto, exactamente como hace main.ts. Si ambas pasan, los
 * adaptadores son intercambiables (principio de sustitución de Liskov).
 */
import { Pool } from 'pg';
import { crearCasosDeUso } from '../../src/aplicacion/caso_uso';
import { CasosDeUso } from '../../src/aplicacion/caso_uso';
import { AdapSalida_CifradorBcrypt } from '../../src/infraestructura/adaptadores/salida/AdapSalida_CifradorBcrypt';
import { AdapSalida_TokensJwt } from '../../src/infraestructura/adaptadores/salida/AdapSalida_TokensJwt';
import { persistenciaMemoria, persistenciaPostgres } from '../../src/main';
import { ADMIN, RelojFalso, SECRETO_PRUEBAS } from '../ayudantes';
import { poolDePruebas, reiniciarBase } from './preparar';

let pool: Pool;
beforeAll(async () => {
  pool = await poolDePruebas();
});
afterAll(() => pool.end());

type Fabrica = (reloj: RelojFalso) => Promise<CasosDeUso>;

const fabricas: Array<[string, Fabrica]> = [
  ['memoria', async (reloj) => armar(persistenciaMemoria(reloj), reloj)],
  [
    'postgres',
    async (reloj) => {
      await reiniciarBase(pool);
      return armar(persistenciaPostgres(pool), reloj);
    },
  ],
];

function armar(persistencia: ReturnType<typeof persistenciaMemoria>, reloj: RelojFalso): CasosDeUso {
  return crearCasosDeUso({
    ...persistencia,
    cifrador: new AdapSalida_CifradorBcrypt(4),
    tokens: new AdapSalida_TokensJwt(SECRETO_PRUEBAS),
    reloj,
    zonaHoraria: 'America/Guayaquil',
  });
}

describe.each(fabricas)('Núcleo con adaptadores de %s', (_nombre, fabrica) => {
  let casos: CasosDeUso;
  let reloj: RelojFalso;

  beforeEach(async () => {
    // Hora de hoy para que coincida con el NOW() de PostgreSQL en las sesiones.
    reloj = new RelojFalso(new Date());
    casos = await fabrica(reloj);
  });

  it('registro, login y perfil', async () => {
    const u = await casos.usuario.escritura.registrarUsuario({ nombre: 'Terry', correo: 'Terry@X.com', contrasena: 'Clave1234' });
    await expect(casos.usuario.escritura.registrarUsuario({ nombre: 'Otro', correo: 'terry@x.com', contrasena: 'Clave1234' }))
      .rejects.toMatchObject({ tipo: 'CONFLICTO' });
    const { token } = await casos.usuario.escritura.iniciarSesion({ correo: 'terry@x.com', contrasena: 'Clave1234' });
    expect((await casos.usuario.lectura.autenticarSolicitud({ token })).id).toBe(u.id);
    expect((await casos.accion.lectura.obtenerAsignaciones({ idUsuario: u.id }))).toHaveLength(7);
  });

  it('CU-03 completo con historial y estadísticas', async () => {
    const { usuario } = await casos.usuario.escritura.iniciarSesion(ADMIN);
    await casos.accion.escritura.cambiarAsignacion({ idUsuario: usuario.id, idGesto: 4, idAccion: 7 });
    const s = await casos.reconocimiento.escritura.abrirSesion({ idUsuario: usuario.id, navegador: 'jest' });
    for (const codigoGesto of ['Victory', 'Victory', 'Closed_Fist']) {
      await casos.reconocimiento.escritura.registrarDeteccion({
        idUsuario: usuario.id, idSesion: s.id, codigoGesto, confianza: 0.9, mano: 'Derecha',
        fechaHora: new Date(Date.now() + 1000).toISOString(),
      });
    }
    const cerrada = await casos.reconocimiento.escritura.cerrarSesion({ idUsuario: usuario.id, idSesion: s.id });
    expect(cerrada.totalDetecciones).toBe(3);
    await expect(casos.reconocimiento.escritura.registrarDeteccion({
      idUsuario: usuario.id, idSesion: s.id, codigoGesto: 'Victory', confianza: 0.9, mano: 'Derecha',
    })).rejects.toMatchObject({ tipo: 'CONFLICTO' });

    const historial = await casos.historial.lectura.consultarHistorial({ idUsuario: usuario.id, gesto: 'Victory' });
    expect(historial.total).toBe(2);
    expect(historial.elementos[0].codigoAccion).toBe('CORAZON');

    const stats = await casos.historial.lectura.consultarEstadisticas({ idUsuario: usuario.id });
    expect(stats.totalDetecciones).toBe(3);
    expect(stats.gestoMasUsado?.codigo).toBe('Victory');
    expect(stats.usoPorDia.reduce((suma, d) => suma + d.total, 0)).toBe(3);
  });

  it('administración con bitácora y transacción que se deshace al fallar', async () => {
    const g = await casos.administracion.escritura.editarGesto({ idAdministrador: 1, idGesto: 2, cambios: { umbralConfianza: 0.8 } });
    expect(g.umbralConfianza).toBe(0.8);
    await expect(casos.administracion.escritura.gestionarAccion({ tipo: 'desactivar', idAdministrador: 1, idAccion: 8 }))
      .rejects.toMatchObject({ tipo: 'CONFLICTO' });
    const bitacora = await casos.administracion.lectura.consultarBitacora({});
    expect(bitacora.total).toBe(1); // el intento fallido no dejó rastro
    const generales = await casos.administracion.lectura.consultarEstadisticasGenerales({});
    expect(generales.usoPorGesto).toHaveLength(7);
  });
});
