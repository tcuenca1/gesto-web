/**
 * Pruebas del adaptador HTTP (Express) con supertest.
 * Incluye la prueba de aceptación P-05 (permisos) y comprobaciones del contrato de la API.
 */
import request from 'supertest';
import { crearApp } from '../src/infraestructura/http/app';
import { ADMIN, entornoMemoria } from './ayudantes';

function app() {
  const { casos } = entornoMemoria();
  return crearApp(casos, { corsOrigenes: ['http://localhost:4200'], registrarErrores: () => undefined });
}

async function token(servidor: ReturnType<typeof app>, credenciales: { correo: string; contrasena: string }) {
  const r = await request(servidor).post('/api/auth/login').send(credenciales).expect(200);
  return r.body.token as string;
}

describe('API REST', () => {
  it('GET /api/salud responde ok', async () => {
    await request(app()).get('/api/salud').expect(200, /ok/);
  });

  it('registro → login → perfil', async () => {
    const s = app();
    const r = await request(s).post('/api/auth/registro')
      .send({ nombre: 'Neils', correo: 'neils@x.com', contrasena: 'Clave1234' }).expect(201);
    expect(r.body).not.toHaveProperty('contrasenaHash');
    const t = await token(s, { correo: 'neils@x.com', contrasena: 'Clave1234' });
    const yo = await request(s).get('/api/usuarios/yo').set('Authorization', `Bearer ${t}`).expect(200);
    expect(yo.body.rol).toBe('USUARIO');
  });

  it('errores de validación devuelven 400 con mensaje en español', async () => {
    const r = await request(app()).post('/api/auth/registro').send({ nombre: 'X', correo: 'malo', contrasena: '123' }).expect(400);
    expect(r.body.error).toEqual({ codigo: 'VALIDACION', mensaje: 'El correo no tiene un formato válido' });
  });

  describe('P-05 · Permisos', () => {
    it('una ruta de administrador sin token se rechaza (401)', async () => {
      await request(app()).get('/api/admin/usuarios').expect(401);
    });

    it('una ruta de administrador con un usuario normal se rechaza (403)', async () => {
      const s = app();
      await request(s).post('/api/auth/registro').send({ nombre: 'Ana', correo: 'ana@x.com', contrasena: 'Clave1234' });
      const t = await token(s, { correo: 'ana@x.com', contrasena: 'Clave1234' });
      await request(s).get('/api/admin/usuarios').set('Authorization', `Bearer ${t}`).expect(403);
    });

    it('el administrador sí entra', async () => {
      const s = app();
      const t = await token(s, ADMIN);
      await request(s).get('/api/admin/usuarios').set('Authorization', `Bearer ${t}`).expect(200);
    });

    it('un token alterado se rechaza', async () => {
      const s = app();
      const t = await token(s, ADMIN);
      await request(s).get('/api/usuarios/yo').set('Authorization', `Bearer ${t.slice(0, -2)}xx`).expect(401);
    });
  });

  it('CU-03 por HTTP: sesión, detección, historial y CSV', async () => {
    const s = app();
    const t = await token(s, ADMIN);
    const auth = { Authorization: `Bearer ${t}` };
    const sesion = await request(s).post('/api/sesiones').set(auth).send({ navegador: 'Jest' }).expect(201);
    await request(s).post(`/api/sesiones/${sesion.body.id}/detecciones`).set(auth)
      .send({ codigoGesto: 'Open_Palm', confianza: 0.88, mano: 'Derecha' }).expect(201);
    await request(s).patch(`/api/sesiones/${sesion.body.id}/cerrar`).set(auth).expect(200);
    await request(s).post(`/api/sesiones/${sesion.body.id}/detecciones`).set(auth)
      .send({ codigoGesto: 'Open_Palm', confianza: 0.88, mano: 'Derecha' }).expect(409);

    const historial = await request(s).get('/api/historial?gesto=Open_Palm').set(auth).expect(200);
    expect(historial.body.total).toBe(1);

    const csv = await request(s).get('/api/historial/csv').set(auth).expect(200);
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.headers['content-disposition']).toMatch(/attachment; filename="historial-gestoweb-/);
  });

  it('RNF-01 · el servidor no acepta cuerpos grandes como una imagen (413)', async () => {
    const s = app();
    const t = await token(s, ADMIN);
    const imagenFalsa = 'data:image/png;base64,' + 'A'.repeat(50_000);
    await request(s).post('/api/sesiones/1/detecciones').set('Authorization', `Bearer ${t}`)
      .send({ codigoGesto: 'Open_Palm', confianza: 0.9, mano: 'Derecha', imagen: imagenFalsa }).expect(413);
  });

  it('rutas inexistentes devuelven 404 en JSON', async () => {
    const s = app();
    const t = await token(s, ADMIN);
    await request(s).get('/api/no-existe').set('Authorization', `Bearer ${t}`).expect(404);
  });
});
