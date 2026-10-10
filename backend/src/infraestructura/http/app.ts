import cors from 'cors';
import express, { Express } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { CasosDeUso } from '../../aplicacion/puertos/entrada';
import { autenticacion, cabecerasSeguridad, exigirRol, manejadorErrores } from './middlewares';
import { rutasAdmin } from './rutas/rutasAdmin';
import { rutasAuth } from './rutas/rutasAuth';
import { rutasUsuario } from './rutas/rutasUsuario';

export interface OpcionesApp {
  corsOrigenes: string[];
  /** Si se indica, el backend también sirve el frontend compilado (útil para la demo en localhost). */
  carpetaFrontend?: string | null;
  registrarErrores?: (error: unknown) => void;
}

/**
 * Adaptador de entrada HTTP: crea la aplicación Express a partir de los
 * casos de uso. Recibe los puertos de entrada ya construidos, por eso en
 * las pruebas se le pueden pasar casos de uso con repositorios en memoria.
 */
export function crearApp(casos: CasosDeUso, opciones: OpcionesApp): Express {
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

  const conToken = autenticacion(casos.usuarios.autenticar);
  app.use('/api/auth', rutasAuth(casos));
  app.use('/api/admin', conToken, exigirRol('ADMIN'), rutasAdmin(casos));
  app.use('/api', conToken, rutasUsuario(casos));
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
