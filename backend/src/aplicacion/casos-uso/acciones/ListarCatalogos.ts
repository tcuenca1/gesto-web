import { AccionDTO, GestoDTO } from '../../puertos/entrada/dtos';
import { ListarAccionesPuerto, ListarGestosPuerto } from '../../puertos/entrada/acciones';
import { AccionRepositorio } from '../../puertos/salida/AccionRepositorio';
import { GestoRepositorio } from '../../puertos/salida/GestoRepositorio';
import { accionADto, gestoADto } from '../comun';

/** GET /api/gestos · Lista los gestos (por defecto, solo los activos). */
export class ListarGestos implements ListarGestosPuerto {
  constructor(private readonly gestos: GestoRepositorio) {}

  async ejecutar({ incluirInactivos = false }: { incluirInactivos?: boolean }): Promise<GestoDTO[]> {
    const gestos = await this.gestos.listar({ soloActivos: !incluirInactivos });
    return gestos.map(gestoADto);
  }
}

/** GET /api/acciones · Lista las acciones (por defecto, solo las activas). */
export class ListarAcciones implements ListarAccionesPuerto {
  constructor(private readonly acciones: AccionRepositorio) {}

  async ejecutar({ incluirInactivas = false }: { incluirInactivas?: boolean }): Promise<AccionDTO[]> {
    const acciones = await this.acciones.listar({ soloActivas: !incluirInactivas });
    return acciones.map(accionADto);
  }
}
