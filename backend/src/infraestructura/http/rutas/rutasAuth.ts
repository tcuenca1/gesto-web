import { Router } from 'express';
import { CasosDeUso } from '../../../aplicacion/puertos/entrada';
import { limitarIntentos, manejar } from '../middlewares';

/**
 * Rutas públicas (rol Visitante): registro e inicio de sesión.
 * Cerrar sesión (RF-03) se hace en el navegador borrando el token:
 * con JWT el servidor no guarda sesiones.
 */
export function rutasAuth(casos: CasosDeUso): Router {
  const r = Router();
  r.use(limitarIntentos(30, 15 * 60 * 1000));

  r.post('/registro', manejar(async (req, res) => {
    const { nombre, correo, contrasena } = req.body ?? {};
    res.status(201).json(await casos.usuarios.registrar.ejecutar({ nombre, correo, contrasena }));
  }));

  r.post('/login', manejar(async (req, res) => {
    const { correo, contrasena } = req.body ?? {};
    res.json(await casos.usuarios.iniciarSesion.ejecutar({ correo, contrasena }));
  }));

  return r;
}
