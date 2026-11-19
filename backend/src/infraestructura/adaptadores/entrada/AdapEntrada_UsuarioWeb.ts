import { Request, Response } from 'express';
import { PuertoEntradaUsuarioEscritura } from '../../../aplicacion/puerto/entrada/PuertoEntradaUsuarioEscritura';
import { PuertoEntradaUsuarioLectura } from '../../../aplicacion/puerto/entrada/PuertoEntradaUsuarioLectura';
import { usuarioDe } from '../../util/middlewares';

/**
 * Adaptador de entrada HTTP del módulo Usuario.
 * Cerrar sesión (RF-03) invalida el token en el servidor (version_token) y el
 * navegador además lo borra.
 */
export class AdapEntrada_UsuarioWeb {
  constructor(
    private readonly cuLectura: PuertoEntradaUsuarioLectura,
    private readonly cuEscritura: PuertoEntradaUsuarioEscritura,
  ) {}

  /** POST /api/auth/registro */
  async registrarUsuario(req: Request, res: Response): Promise<void> {
    const { nombre, correo, contrasena } = req.body ?? {};
    res.status(201).json(await this.cuEscritura.registrarUsuario({ nombre, correo, contrasena }));
  }

  /** POST /api/auth/login */
  async iniciarSesion(req: Request, res: Response): Promise<void> {
    const { correo, contrasena } = req.body ?? {};
    res.json(await this.cuEscritura.iniciarSesion({ correo, contrasena }));
  }

  /** POST /api/auth/logout */
  async cerrarSesion(_req: Request, res: Response): Promise<void> {
    await this.cuEscritura.cerrarSesion({ idUsuario: usuarioDe(res).id });
    res.status(204).end();
  }

  /** GET /api/usuarios/yo */
  async obtenerPerfil(_req: Request, res: Response): Promise<void> {
    res.json(await this.cuLectura.obtenerPerfil({ idUsuario: usuarioDe(res).id }));
  }

  /** PUT /api/usuarios/yo */
  async editarPerfil(req: Request, res: Response): Promise<void> {
    const { nombre, contrasenaActual, contrasenaNueva } = req.body ?? {};
    res.json(await this.cuEscritura.editarPerfil({ idUsuario: usuarioDe(res).id, nombre, contrasenaActual, contrasenaNueva }));
  }
}
