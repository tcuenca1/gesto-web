import { Request, Response } from 'express';
import { PuertoEntradaReconocimientoEscritura } from '../../../aplicacion/puerto/entrada/PuertoEntradaReconocimientoEscritura';
import { usuarioDe } from '../../util/middlewares';

/** Adaptador de entrada HTTP del reconocimiento (CU-03). */
export class AdapEntrada_ReconocimientoWeb {
  constructor(private readonly cuEscritura: PuertoEntradaReconocimientoEscritura) {}

  /** POST /api/sesiones */
  async abrirSesion(req: Request, res: Response): Promise<void> {
    const navegador = req.body?.navegador ?? req.header('user-agent');
    res.status(201).json(await this.cuEscritura.abrirSesion({ idUsuario: usuarioDe(res).id, navegador }));
  }

  /** PATCH /api/sesiones/:id/cerrar */
  async cerrarSesion(req: Request, res: Response): Promise<void> {
    res.json(await this.cuEscritura.cerrarSesion({ idUsuario: usuarioDe(res).id, idSesion: req.params.id }));
  }

  /** POST /api/sesiones/:id/detecciones */
  async registrarDeteccion(req: Request, res: Response): Promise<void> {
    const { codigoGesto, confianza, mano, fechaHora } = req.body ?? {};
    res.status(201).json(await this.cuEscritura.registrarDeteccion({
      idUsuario: usuarioDe(res).id,
      idSesion: req.params.id,
      codigoGesto,
      confianza,
      mano,
      fechaHora,
    }));
  }
}
