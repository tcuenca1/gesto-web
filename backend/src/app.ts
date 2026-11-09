import cors from 'cors';
import express, { Express } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { Contenedores } from './contenedor';
import {
  autenticacion,
  cabecerasSeguridad,
  exigirRol,
  limitarIntentos,
  manejadorErrores,
  manejar,
} from './infraestructura/util/middlewares';

export interface OpcionesApp {
  corsOrigenes: string[];
  /** Si se indica, el backend también sirve el frontend compilado (útil para la demo en localhost). */
  carpetaFrontend?: string | null;
  registrarErrores?: (error: unknown) => void;
}

/**
 * Crea la aplicación Express. Solo enruta: cada ruta delega en el adaptador
 * de entrada de su contenedor (contenedor.adap.metodo), igual que app.js en
 * el proyecto de clase.
 */
export function crearApp(c: Contenedores, opciones: OpcionesApp): Express {
  const usuario = c.usuario.adap;
  const reconocimiento = c.reconocimiento.adap;
  const accion = c.accion.adap;
  const historial = c.historial.adap;
  const administracion = c.administracion.adap;

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // Railway / Render ponen un proxy delante
  app.use(cabecerasSeguridad);
  app.use('/api', cors({ origin: opciones.corsOrigenes, exposedHeaders: ['Content-Disposition'] }));
  // RNF-01: las detecciones pesan unos pocos bytes; un límite bajo impide subir imágenes.
  app.use(express.json({ limit: '20kb' }));

  app.get('/api/salud', (_req, res) => {
    res.json({ estado: 'ok', hora: new Date().toISOString() });
  });

  // ---------------- Visitante: registro e inicio de sesión ----------------
  app.use('/api/auth', limitarIntentos(30, 15 * 60 * 1000));
  app.post('/api/auth/registro', manejar((req, res) => usuario.registrarUsuario(req, res)));
  app.post('/api/auth/login', manejar((req, res) => usuario.iniciarSesion(req, res)));

  // ---------------- Administrador (token + rol ADMIN) ----------------
  const conToken = autenticacion(c.usuario.cuLectura);
  app.use('/api/admin', conToken, exigirRol('ADMIN'));
  app.get('/api/admin/gestos', manejar((req, res) => accion.listarTodosLosGestos(req, res)));
  app.put('/api/admin/gestos/:id', manejar((req, res) => administracion.editarGesto(req, res)));
  app.get('/api/admin/acciones', manejar((req, res) => accion.listarTodasLasAcciones(req, res)));
  app.post('/api/admin/acciones', manejar((req, res) => administracion.crearAccion(req, res)));
  app.put('/api/admin/acciones/:id', manejar((req, res) => administracion.editarAccion(req, res)));
  app.delete('/api/admin/acciones/:id', manejar((req, res) => administracion.desactivarAccion(req, res)));
  app.get('/api/admin/usuarios', manejar((req, res) => administracion.listarUsuarios(req, res)));
  app.patch('/api/admin/usuarios/:id', manejar((req, res) => administracion.gestionarUsuario(req, res)));
  app.get('/api/admin/estadisticas', manejar((req, res) => administracion.consultarEstadisticasGenerales(req, res)));
  app.get('/api/admin/bitacora', manejar((req, res) => administracion.consultarBitacora(req, res)));

  // ---------------- Usuario (token) ----------------
  app.use('/api', conToken);
  app.get('/api/usuarios/yo', manejar((req, res) => usuario.obtenerPerfil(req, res)));
  app.put('/api/usuarios/yo', manejar((req, res) => usuario.editarPerfil(req, res)));

  app.get('/api/gestos', manejar((req, res) => accion.listarGestos(req, res)));
  app.get('/api/acciones', manejar((req, res) => accion.listarAcciones(req, res)));
  app.get('/api/asignaciones', manejar((req, res) => accion.obtenerAsignaciones(req, res)));
  app.post('/api/asignaciones/restaurar', manejar((req, res) => accion.restaurarAsignaciones(req, res)));
  app.put('/api/asignaciones/:idGesto', manejar((req, res) => accion.cambiarAsignacion(req, res)));

  app.post('/api/sesiones', manejar((req, res) => reconocimiento.abrirSesion(req, res)));
  app.patch('/api/sesiones/:id/cerrar', manejar((req, res) => reconocimiento.cerrarSesion(req, res)));
  app.post('/api/sesiones/:id/detecciones', manejar((req, res) => reconocimiento.registrarDeteccion(req, res)));

  app.get('/api/historial', manejar((req, res) => historial.consultarHistorial(req, res)));
  app.get('/api/historial/csv', manejar((req, res) => historial.exportarHistorial(req, res)));
  app.get('/api/estadisticas', manejar((req, res) => historial.consultarEstadisticas(req, res)));

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: { codigo: 'NO_ENCONTRADO', mensaje: 'La ruta no existe' } });
  });

  const carpeta = opciones.carpetaFrontend ? path.resolve(opciones.carpetaFrontend) : null;
  if (carpeta && fs.existsSync(path.join(carpeta, 'index.html'))) {
    app.use(express.static(carpeta, { index: false, maxAge: '1h' }));
    // Las rutas de Angular (/reconocer, /historial…) devuelven index.html;
    // un archivo que no existe (por ejemplo, el modelo sin descargar) da 404.
    app.get(/^(?!\/api)(?!.*\.[a-z0-9]+$).*/i, (_req, res) => res.sendFile(path.join(carpeta, 'index.html')));
  }

  app.use(manejadorErrores(opciones.registrarErrores));
  return app;
}
