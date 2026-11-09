import { Request, Response } from 'express';
import { PuertoEntradaAccionEscritura } from '../../../aplicacion/puerto/entrada/PuertoEntradaAccionEscritura';
import { PuertoEntradaAccionLectura } from '../../../aplicacion/puerto/entrada/PuertoEntradaAccionLectura';
import { usuarioDe } from '../../util/middlewares';

/** Adaptador de entrada HTTP de catálogos y asignaciones gesto → acción. */
export class AdapEntrada_AccionWeb {
  constructor(
    private readonly cuLectura: PuertoEntradaAccionLectura,
    private readonly cuEscritura: PuertoEntradaAccionEscritura,
  ) {}

  /** GET /api/gestos (solo activos) */
  async listarGestos(_req: Request, res: Response): Promise<void> {
    res.json(await this.cuLectura.listarGestos({}));
  }

  /** GET /api/admin/gestos (incluye los inactivos) */
  async listarTodosLosGestos(_req: Request, res: Response): Promise<void> {
    res.json(await this.cuLectura.listarGestos({ incluirInactivos: true }));
  }

  /** GET /api/acciones (solo activas) */
  async listarAcciones(_req: Request, res: Response): Promise<void> {
    res.json(await this.cuLectura.listarAcciones({}));
  }

  /** GET /api/admin/acciones (incluye las inactivas) */
  async listarTodasLasAcciones(_req: Request, res: Response): Promise<void> {
    res.json(await this.cuLectura.listarAcciones({ incluirInactivas: true }));
  }

  /** GET /api/asignaciones */
  async obtenerAsignaciones(_req: Request, res: Response): Promise<void> {
    res.json(await this.cuLectura.obtenerAsignaciones({ idUsuario: usuarioDe(res).id }));
  }

  /** PUT /api/asignaciones/:idGesto */
  async cambiarAsignacion(req: Request, res: Response): Promise<void> {
    res.json(await this.cuEscritura.cambiarAsignacion({
      idUsuario: usuarioDe(res).id,
      idGesto: req.params.idGesto,
      idAccion: req.body?.idAccion,
    }));
  }

  /** POST /api/asignaciones/restaurar */
  async restaurarAsignaciones(_req: Request, res: Response): Promise<void> {
    res.json(await this.cuEscritura.restaurarAsignaciones({ idUsuario: usuarioDe(res).id }));
  }
}
