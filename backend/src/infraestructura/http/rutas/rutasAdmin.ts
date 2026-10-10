import { Router } from 'express';
import { CasosDeUso } from '../../../aplicacion/puertos/entrada';
import { leerEnteroPositivo } from '../../../aplicacion/casos-uso/comun';
import { manejar, usuarioDe } from '../middlewares';

/**
 * Rutas del rol Administrador (SRS §8.2). Se montan detrás de los
 * middlewares de token y de rol ADMIN.
 *
 * Además del contrato, se agregan dos lecturas que el panel necesita:
 * GET /api/admin/gestos y GET /api/admin/acciones (incluyen los inactivos).
 */
export function rutasAdmin(casos: CasosDeUso): Router {
  const r = Router();
  const id = (valor: unknown) => leerEnteroPositivo(valor, 'id');
  const adminId = (res: Parameters<typeof usuarioDe>[0]) => usuarioDe(res).id;

  // ---------------- Gestos (RF-18) ----------------
  r.get('/gestos', manejar(async (_req, res) => {
    res.json(await casos.acciones.listarGestos.ejecutar({ incluirInactivos: true }));
  }));

  r.put('/gestos/:id', manejar(async (req, res) => {
    const { nombre, descripcion, umbralConfianza, activo } = req.body ?? {};
    res.json(await casos.administracion.editarGesto.ejecutar({
      idAdministrador: adminId(res),
      idGesto: id(req.params.id),
      cambios: { nombre, descripcion, umbralConfianza, activo },
    }));
  }));

  // ---------------- Acciones (RF-19) ----------------
  r.get('/acciones', manejar(async (_req, res) => {
    res.json(await casos.acciones.listarAcciones.ejecutar({ incluirInactivas: true }));
  }));

  r.post('/acciones', manejar(async (req, res) => {
    const { codigo, nombre, descripcion } = req.body ?? {};
    res.status(201).json(await casos.administracion.gestionarAcciones.ejecutar({
      tipo: 'crear', idAdministrador: adminId(res), datos: { codigo, nombre, descripcion },
    }));
  }));

  r.put('/acciones/:id', manejar(async (req, res) => {
    const { nombre, descripcion, activa } = req.body ?? {};
    res.json(await casos.administracion.gestionarAcciones.ejecutar({
      tipo: 'editar', idAdministrador: adminId(res), idAccion: id(req.params.id), datos: { nombre, descripcion, activa },
    }));
  }));

  r.delete('/acciones/:id', manejar(async (req, res) => {
    res.json(await casos.administracion.gestionarAcciones.ejecutar({
      tipo: 'desactivar', idAdministrador: adminId(res), idAccion: id(req.params.id),
    }));
  }));

  // ---------------- Usuarios (RF-20) ----------------
  r.get('/usuarios', manejar(async (_req, res) => {
    res.json(await casos.administracion.listarUsuarios.ejecutar({}));
  }));

  r.patch('/usuarios/:id', manejar(async (req, res) => {
    const { rol, activo } = req.body ?? {};
    res.json(await casos.administracion.gestionarUsuarios.ejecutar({
      idAdministrador: adminId(res), idUsuario: id(req.params.id), cambios: { rol, activo },
    }));
  }));

  // ---------------- Estadísticas y bitácora (RF-21, RF-22) ----------------
  r.get('/estadisticas', manejar(async (req, res) => {
    const { desde, hasta, zona } = req.query;
    res.json(await casos.administracion.estadisticasGenerales.ejecutar({ desde, hasta, zonaHoraria: zona }));
  }));

  r.get('/bitacora', manejar(async (req, res) => {
    const { pagina, limite } = req.query;
    res.json(await casos.administracion.consultarBitacora.ejecutar({ pagina, limite }));
  }));

  return r;
}
