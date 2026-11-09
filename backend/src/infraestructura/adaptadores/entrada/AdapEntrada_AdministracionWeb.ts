import { Request, Response } from 'express';
import { PuertoEntradaAdministracionEscritura } from '../../../aplicacion/puerto/entrada/PuertoEntradaAdministracionEscritura';
import { PuertoEntradaAdministracionLectura } from '../../../aplicacion/puerto/entrada/PuertoEntradaAdministracionLectura';
import { usuarioDe } from '../../util/middlewares';

/**
 * Adaptador de entrada HTTP del rol Administrador (SRS §8.2).
 * Sus rutas van detrás de los middlewares de token y de rol ADMIN.
 */
export class AdapEntrada_AdministracionWeb {
  constructor(
    private readonly cuLectura: PuertoEntradaAdministracionLectura,
    private readonly cuEscritura: PuertoEntradaAdministracionEscritura,
  ) {}

  /** PUT /api/admin/gestos/:id (RF-18) */
  async editarGesto(req: Request, res: Response): Promise<void> {
    const { nombre, descripcion, umbralConfianza, activo } = req.body ?? {};
    res.json(await this.cuEscritura.editarGesto({
      idAdministrador: usuarioDe(res).id,
      idGesto: req.params.id,
      cambios: { nombre, descripcion, umbralConfianza, activo },
    }));
  }

  /** POST /api/admin/acciones (RF-19) */
  async crearAccion(req: Request, res: Response): Promise<void> {
    const { codigo, nombre, descripcion } = req.body ?? {};
    res.status(201).json(await this.cuEscritura.gestionarAccion({
      tipo: 'crear', idAdministrador: usuarioDe(res).id, datos: { codigo, nombre, descripcion },
    }));
  }

  /** PUT /api/admin/acciones/:id (RF-19) */
  async editarAccion(req: Request, res: Response): Promise<void> {
    const { nombre, descripcion, activa } = req.body ?? {};
    res.json(await this.cuEscritura.gestionarAccion({
      tipo: 'editar', idAdministrador: usuarioDe(res).id, idAccion: req.params.id, datos: { nombre, descripcion, activa },
    }));
  }

  /** DELETE /api/admin/acciones/:id (RF-19, borrado lógico) */
  async desactivarAccion(req: Request, res: Response): Promise<void> {
    res.json(await this.cuEscritura.gestionarAccion({
      tipo: 'desactivar', idAdministrador: usuarioDe(res).id, idAccion: req.params.id,
    }));
  }

  /** GET /api/admin/usuarios (RF-20) */
  async listarUsuarios(_req: Request, res: Response): Promise<void> {
    res.json(await this.cuLectura.listarUsuarios());
  }

  /** PATCH /api/admin/usuarios/:id (RF-20) */
  async gestionarUsuario(req: Request, res: Response): Promise<void> {
    const { rol, activo } = req.body ?? {};
    res.json(await this.cuEscritura.gestionarUsuario({
      idAdministrador: usuarioDe(res).id, idUsuario: req.params.id, cambios: { rol, activo },
    }));
  }

  /** GET /api/admin/estadisticas (RF-21) */
  async consultarEstadisticasGenerales(req: Request, res: Response): Promise<void> {
    const { desde, hasta, zona } = req.query;
    res.json(await this.cuLectura.consultarEstadisticasGenerales({ desde, hasta, zonaHoraria: zona }));
  }

  /** GET /api/admin/bitacora (RF-22) */
  async consultarBitacora(req: Request, res: Response): Promise<void> {
    const { pagina, limite } = req.query;
    res.json(await this.cuLectura.consultarBitacora({ pagina, limite }));
  }
}
