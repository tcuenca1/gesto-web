import { DtoAccion } from '../../dto/DtoAccion';
import { DtoGesto } from '../../dto/DtoAccion';
import { ListarAccionesPuerto } from '../../puertos/entrada/acciones';
import { ListarGestosPuerto } from '../../puertos/entrada/acciones';
import { PuertoSalidaAccion } from '../../puerto/salida/PuertoSalidaAccion';
import { PuertoSalidaGesto } from '../../puerto/salida/PuertoSalidaGesto';
import { accionARespuesta, gestoARespuesta } from '../../dto/RespuestaAccion';

/** GET /api/gestos · Lista los gestos (por defecto, solo los activos). */
export class ListarGestos implements ListarGestosPuerto {
  constructor(private readonly gestos: PuertoSalidaGesto) {}

  async ejecutar({ incluirInactivos = false }: { incluirInactivos?: boolean }): Promise<DtoGesto[]> {
    const gestos = await this.gestos.listar({ soloActivos: !incluirInactivos });
    return gestos.map(gestoARespuesta);
  }
}

/** GET /api/acciones · Lista las acciones (por defecto, solo las activas). */
export class ListarAcciones implements ListarAccionesPuerto {
  constructor(private readonly acciones: PuertoSalidaAccion) {}

  async ejecutar({ incluirInactivas = false }: { incluirInactivas?: boolean }): Promise<DtoAccion[]> {
    const acciones = await this.acciones.listar({ soloActivas: !incluirInactivas });
    return acciones.map(accionARespuesta);
  }
}
