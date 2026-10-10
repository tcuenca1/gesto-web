import { AsignacionDTO } from '../../puertos/entrada/dtos';
import { ObtenerAsignacionesPuerto, RestaurarAsignacionesPuerto } from '../../puertos/entrada/acciones';
import { AsignacionRepositorio } from '../../puertos/salida/AsignacionRepositorio';

/** RF-12 · Vuelve a la configuración inicial y devuelve cómo quedó. */
export class RestaurarAsignaciones implements RestaurarAsignacionesPuerto {
  constructor(
    private readonly asignaciones: AsignacionRepositorio,
    private readonly obtenerAsignaciones: ObtenerAsignacionesPuerto,
  ) {}

  async ejecutar({ idUsuario }: { idUsuario: number }): Promise<AsignacionDTO[]> {
    await this.asignaciones.restaurar(idUsuario);
    return this.obtenerAsignaciones.ejecutar({ idUsuario });
  }
}
