import { Request, Response } from 'express';
import { PuertoEntradaHistorialLectura } from '../../../aplicacion/puerto/entrada/PuertoEntradaHistorialLectura';
import { usuarioDe } from '../../util/middlewares';

/** Adaptador de entrada HTTP del historial y las estadísticas propias. */
export class AdapEntrada_HistorialWeb {
  constructor(private readonly cuLectura: PuertoEntradaHistorialLectura) {}

  /** GET /api/historial */
  async consultarHistorial(req: Request, res: Response): Promise<void> {
    const { desde, hasta, gesto, pagina, limite } = req.query;
    res.json(await this.cuLectura.consultarHistorial({ idUsuario: usuarioDe(res).id, desde, hasta, gesto, pagina, limite }));
  }

  /** GET /api/historial/csv */
  async exportarHistorial(req: Request, res: Response): Promise<void> {
    const { desde, hasta, gesto, zona } = req.query;
    const archivo = await this.cuLectura.exportarHistorial({ idUsuario: usuarioDe(res).id, desde, hasta, gesto, zonaHoraria: zona });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${archivo.nombreArchivo}"`);
    res.send(archivo.contenido);
  }

  /** GET /api/estadisticas */
  async consultarEstadisticas(req: Request, res: Response): Promise<void> {
    const { desde, hasta, zona } = req.query;
    res.json(await this.cuLectura.consultarEstadisticas({ idUsuario: usuarioDe(res).id, desde, hasta, zonaHoraria: zona }));
  }
}
