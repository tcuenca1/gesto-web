import { AccionDTO, GestoDTO } from '../../puertos/entrada/dtos';
import { ListarAccionesPuerto, ListarGestosPuerto } from '../../puertos/entrada/acciones';
import { PuertoSalidaAccion } from '../../puerto/salida/PuertoSalidaAccion';
import { PuertoSalidaGesto } from '../../puerto/salida/PuertoSalidaGesto';
import { accionADto, gestoADto } from '../comun';

/** GET /api/gestos · Lista los gestos (por defecto, solo los activos). */
export class ListarGestos implements ListarGestosPuerto {
  constructor(private readonly gestos: PuertoSalidaGesto) {}

  async ejecutar({ incluirInactivos = false }: { incluirInactivos?: boolean }): Promise<GestoDTO[]> {
    const gestos = await this.gestos.listar({ soloActivos: !incluirInactivos });
    return gestos.map(gestoADto);
  }
}

/** GET /api/acciones · Lista las acciones (por defecto, solo las activas). */
export class ListarAcciones implements ListarAccionesPuerto {
  constructor(private readonly acciones: PuertoSalidaAccion) {}

  async ejecutar({ incluirInactivas = false }: { incluirInactivas?: boolean }): Promise<AccionDTO[]> {
    const acciones = await this.acciones.listar({ soloActivas: !incluirInactivas });
    return acciones.map(accionADto);
  }
}
