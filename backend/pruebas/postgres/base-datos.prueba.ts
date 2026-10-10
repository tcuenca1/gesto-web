/**
 * Pruebas de la lógica dentro de PostgreSQL (SRS §9.3) y pruebas de
 * aceptación P-06 y P-07. Se ejecutan con:  npm run test:pg
 */
import { Pool } from 'pg';
import { poolDePruebas, reiniciarBase } from './preparar';

let pool: Pool;

beforeAll(async () => {
  pool = await poolDePruebas();
});
beforeEach(() => reiniciarBase(pool));
afterAll(() => pool.end());

async function crearUsuario(correo = 'ana@x.com'): Promise<number> {
  const { rows } = await pool.query(
    `INSERT INTO usuarios (nombre, correo, contrasena_hash) VALUES ('Ana', $1, '$2b$10$abcdefghijklmnopqrstuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu') RETURNING id_usuario`,
    [correo],
  );
  return rows[0].id_usuario;
}

async function abrirSesion(idUsuario: number): Promise<number> {
  const { rows } = await pool.query('CALL sp_abrir_sesion($1, $2, NULL)', [idUsuario, 'jest']);
  return rows[0].p_id_sesion;
}

describe('Datos iniciales (04_datos_iniciales.sql)', () => {
  it('carga 2 roles, 8 acciones, 7 gestos y 1 administrador', async () => {
    const { rows } = await pool.query(`
      SELECT (SELECT COUNT(*) FROM roles) roles, (SELECT COUNT(*) FROM acciones) acciones,
             (SELECT COUNT(*) FROM gestos) gestos, (SELECT COUNT(*) FROM usuarios WHERE id_rol = 2) admins`);
    expect(rows[0]).toEqual({ roles: 2, acciones: 8, gestos: 7, admins: 1 });
  });
});

describe('P-06 · Contraseñas', () => {
  it('ninguna contraseña de la tabla usuarios es legible (todas son hash bcrypt)', async () => {
    const { rows } = await pool.query('SELECT contrasena_hash FROM usuarios');
    for (const { contrasena_hash } of rows) {
      expect(contrasena_hash).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);
      expect(contrasena_hash).not.toContain('Admin123!');
    }
  });
});

describe('P-07 · Lógica de la base de datos', () => {
  it('trg_asignaciones_iniciales: al crear un usuario se crean sus 7 asignaciones', async () => {
    const id = await crearUsuario();
    const { rows } = await pool.query('SELECT COUNT(*) AS total FROM asignaciones WHERE id_usuario = $1', [id]);
    expect(rows[0].total).toBe(7);
  });

  it('trg_validar_sesion_abierta: una detección en una sesión cerrada se rechaza', async () => {
    const id = await crearUsuario();
    const sesion = await abrirSesion(id);
    await pool.query(`UPDATE sesiones_reconocimiento SET fecha_fin = NOW() AT TIME ZONE 'UTC' WHERE id_sesion = $1`, [sesion]);
    await expect(
      pool.query(`INSERT INTO detecciones (id_sesion, id_gesto, confianza, mano) VALUES ($1, 1, 0.9, 'Derecha')`, [sesion]),
    ).rejects.toMatchObject({ code: 'GW001' });
  });

  it('trg_contar_detecciones: suma 1 al total de la sesión', async () => {
    const id = await crearUsuario();
    const sesion = await abrirSesion(id);
    for (let i = 0; i < 3; i++) {
      await pool.query(`INSERT INTO detecciones (id_sesion, id_gesto, confianza, mano) VALUES ($1, 2, 0.8, 'Izquierda')`, [sesion]);
    }
    const { rows } = await pool.query('SELECT total_detecciones FROM sesiones_reconocimiento WHERE id_sesion = $1', [sesion]);
    expect(rows[0].total_detecciones).toBe(3);
  });

  it('sp_abrir_sesion: cierra la sesión abierta anterior y abre una nueva', async () => {
    const id = await crearUsuario();
    const primera = await abrirSesion(id);
    const segunda = await abrirSesion(id);
    const { rows } = await pool.query(
      'SELECT id_sesion, fecha_fin IS NULL AS abierta FROM sesiones_reconocimiento WHERE id_usuario = $1 ORDER BY id_sesion',
      [id],
    );
    expect(rows).toEqual([{ id_sesion: primera, abierta: false }, { id_sesion: segunda, abierta: true }]);
  });

  it('sp_restaurar_asignaciones: devuelve la configuración inicial', async () => {
    const id = await crearUsuario();
    await pool.query('UPDATE asignaciones SET id_accion = 8 WHERE id_usuario = $1', [id]);
    await pool.query('CALL sp_restaurar_asignaciones($1)', [id]);
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS distintas FROM asignaciones a JOIN gestos g USING (id_gesto)
        WHERE a.id_usuario = $1 AND a.id_accion <> g.id_accion_predeterminada`,
      [id],
    );
    expect(rows[0].distintas).toBe(0);
  });

  it('fn_estadisticas_usuario y v_historial devuelven los datos del usuario', async () => {
    const id = await crearUsuario();
    const sesion = await abrirSesion(id);
    await pool.query(
      `INSERT INTO detecciones (id_sesion, id_gesto, id_accion, confianza, mano) VALUES ($1, 5, 5, 0.9, 'Derecha'), ($1, 5, 5, 0.7, 'Derecha')`,
      [sesion],
    );
    const stats = await pool.query('SELECT * FROM fn_estadisticas_usuario($1)', [id]);
    expect(stats.rows).toHaveLength(7);
    expect(stats.rows.find((r) => r.codigo === 'Thumb_Up')).toMatchObject({ total: 2, confianza_promedio: 0.8 });

    const historial = await pool.query('SELECT * FROM v_historial WHERE id_usuario = $1', [id]);
    expect(historial.rows[0]).toMatchObject({ nombre_gesto: 'Pulgar arriba', codigo_accion: 'MARCAR_FAVORITA' });
  });

  it('las restricciones CHECK protegen los datos', async () => {
    const id = await crearUsuario();
    const sesion = await abrirSesion(id);
    await expect(pool.query(`INSERT INTO detecciones (id_sesion, id_gesto, confianza, mano) VALUES ($1, 1, 1.5, 'Derecha')`, [sesion]))
      .rejects.toMatchObject({ code: '23514' });
    await expect(pool.query(`INSERT INTO detecciones (id_sesion, id_gesto, confianza, mano) VALUES ($1, 1, 0.9, 'Centro')`, [sesion]))
      .rejects.toMatchObject({ code: '23514' });
    await expect(pool.query(`UPDATE gestos SET umbral_confianza = 1.2 WHERE id_gesto = 1`)).rejects.toMatchObject({ code: '23514' });
  });
});
