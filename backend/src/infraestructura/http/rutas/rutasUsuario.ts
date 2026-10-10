import { Router } from 'express';
import { CasosDeUso } from '../../../aplicacion/puertos/entrada';
import { leerEnteroPositivo } from '../../../aplicacion/casos-uso/comun';
import { manejar, usuarioDe } from '../middlewares';

/**
 * Rutas del rol Usuario (contrato de la API, SRS §8.2).
 * Los controladores son delgados: leen la petición, llaman a un caso de uso
 * y devuelven su resultado. Ninguna regla de negocio vive aquí.
 */
export function rutasUsuario(casos: CasosDeUso): Router {
  const r = Router();
  const id = (valor: unknown) => leerEnteroPositivo(valor, 'id');

  // ---------------- Perfil ----------------
  r.get('/usuarios/yo', manejar(async (_req, res) => {
    res.json(await casos.usuarios.obtenerPerfil.ejecutar({ idUsuario: usuarioDe(res).id }));
  }));

  r.put('/usuarios/yo', manejar(async (req, res) => {
    const { nombre, contrasenaActual, contrasenaNueva } = req.body ?? {};
    res.json(await casos.usuarios.editarPerfil.ejecutar({ idUsuario: usuarioDe(res).id, nombre, contrasenaActual, contrasenaNueva }));
  }));

  // ---------------- Catálogos y asignaciones ----------------
  r.get('/gestos', manejar(async (_req, res) => {
    res.json(await casos.acciones.listarGestos.ejecutar({}));
  }));

  r.get('/acciones', manejar(async (_req, res) => {
    res.json(await casos.acciones.listarAcciones.ejecutar({}));
  }));

  r.get('/asignaciones', manejar(async (_req, res) => {
    res.json(await casos.acciones.obtenerAsignaciones.ejecutar({ idUsuario: usuarioDe(res).id }));
  }));

  r.post('/asignaciones/restaurar', manejar(async (_req, res) => {
    res.json(await casos.acciones.restaurarAsignaciones.ejecutar({ idUsuario: usuarioDe(res).id }));
  }));

  r.put('/asignaciones/:idGesto', manejar(async (req, res) => {
    res.json(await casos.acciones.cambiarAsignacion.ejecutar({
      idUsuario: usuarioDe(res).id,
      idGesto: id(req.params.idGesto),
      idAccion: req.body?.idAccion,
    }));
  }));

  // ---------------- Reconocimiento (CU-03) ----------------
  r.post('/sesiones', manejar(async (req, res) => {
    const navegador = req.body?.navegador ?? req.header('user-agent');
    res.status(201).json(await casos.reconocimiento.abrirSesion.ejecutar({ idUsuario: usuarioDe(res).id, navegador }));
  }));

  r.patch('/sesiones/:id/cerrar', manejar(async (req, res) => {
    res.json(await casos.reconocimiento.cerrarSesion.ejecutar({ idUsuario: usuarioDe(res).id, idSesion: id(req.params.id) }));
  }));

  r.post('/sesiones/:id/detecciones', manejar(async (req, res) => {
    const { codigoGesto, confianza, mano, fechaHora } = req.body ?? {};
    res.status(201).json(await casos.reconocimiento.registrarDeteccion.ejecutar({
      idUsuario: usuarioDe(res).id,
      idSesion: id(req.params.id),
      codigoGesto,
      confianza,
      mano,
      fechaHora,
    }));
  }));

  // ---------------- Historial y estadísticas ----------------
  r.get('/historial', manejar(async (req, res) => {
    const { desde, hasta, gesto, pagina, limite } = req.query;
    res.json(await casos.historial.consultar.ejecutar({ idUsuario: usuarioDe(res).id, desde, hasta, gesto, pagina, limite }));
  }));

  r.get('/historial/csv', manejar(async (req, res) => {
    const { desde, hasta, gesto, zona } = req.query;
    const archivo = await casos.historial.exportar.ejecutar({ idUsuario: usuarioDe(res).id, desde, hasta, gesto, zonaHoraria: zona });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${archivo.nombreArchivo}"`);
    res.send(archivo.contenido);
  }));

  r.get('/estadisticas', manejar(async (req, res) => {
    const { desde, hasta, zona } = req.query;
    res.json(await casos.historial.estadisticas.ejecutar({ idUsuario: usuarioDe(res).id, desde, hasta, zonaHoraria: zona }));
  }));

  return r;
}
