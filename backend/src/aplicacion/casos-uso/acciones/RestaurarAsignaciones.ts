import { DtoAsignacion } from '../../dto/DtoAccion';
import { ObtenerAsignacionesPuerto } from '../../puertos/entrada/acciones';
import { RestaurarAsignacionesPuerto } from '../../puertos/entrada/acciones';
import { PuertoSalidaAsignacion } from '../../puerto/salida/PuertoSalidaAsignacion';

/** RF-12 · Vuelve a la configuración inicial y devuelve cómo quedó. */
export class RestaurarAsignaciones implements RestaurarAsignacionesPuerto {
  constructor(
    private readonly asignaciones: PuertoSalidaAsignacion,
    private readonly obtenerAsignaciones: ObtenerAsignacionesPuerto,
  ) {}

  async ejecutar({ idUsuario }: { idUsuario: number }): Promise<DtoAsignacion[]> {
    await this.asignaciones.restaurar(idUsuario);
    return this.obtenerAsignaciones.ejecutar({ idUsuario });
  }
}
