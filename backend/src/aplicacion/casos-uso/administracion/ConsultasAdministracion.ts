import { resumirEstadisticas } from '../../../dominio/deteccion/Estadisticas';
import {
  ConsultarBitacoraPuerto,
  ConsultarEstadisticasGeneralesPuerto,
  EstadisticasGenerales,
} from '../../puertos/entrada/administracion';
import { Paginado } from '../../puertos/entrada/CasoDeUso';
import { BitacoraRepositorio, EntradaBitacora } from '../../puertos/salida/BitacoraRepositorio';
import { DeteccionRepositorio } from '../../puertos/salida/DeteccionRepositorio';
import { SesionRepositorio } from '../../puertos/salida/SesionRepositorio';
import { UsuarioRepositorio } from '../../puertos/salida/UsuarioRepositorio';
import { leerPaginacion, leerRango, leerZona } from '../comun';

/**
 * RF-21 · Estadísticas de todo el sistema para el administrador.
 * Los totales y el uso por gesto son históricos (vista v_estadisticas_generales);
 * el rango de fechas solo limita el gráfico de uso por día.
 */
export class ConsultarEstadisticasGenerales implements ConsultarEstadisticasGeneralesPuerto {
  constructor(
    private readonly usuarios: UsuarioRepositorio,
    private readonly sesiones: SesionRepositorio,
    private readonly detecciones: DeteccionRepositorio,
    private readonly zonaPorDefecto: string,
  ) {}

  async ejecutar(entrada: { zonaHoraria?: unknown; desde?: unknown; hasta?: unknown }): Promise<EstadisticasGenerales> {
    const zona = leerZona(entrada.zonaHoraria, this.zonaPorDefecto);
    const rango = leerRango(entrada.desde, entrada.hasta);
    const [totalUsuarios, totalSesiones, totalDetecciones, usoPorGesto, usoPorDia] = await Promise.all([
      this.usuarios.contar(),
      this.sesiones.contar(),
      this.detecciones.contar(),
      this.detecciones.usoGeneral(),
      this.detecciones.usoPorDia(null, rango, zona),
    ]);
    const { gestoMasUsado, confianzaPromedio } = resumirEstadisticas(usoPorGesto, usoPorDia);
    return {
      totalUsuarios,
      totalSesiones,
      totalDetecciones,
      usoPorGesto,
      usoPorDia,
      resumen: { gestoMasUsado, confianzaPromedio },
    };
  }
}

/** RF-22 · Ver la bitácora de cambios del administrador. */
export class ConsultarBitacora implements ConsultarBitacoraPuerto {
  constructor(private readonly bitacora: BitacoraRepositorio) {}

  async ejecutar(entrada: { pagina?: unknown; limite?: unknown }): Promise<Paginado<EntradaBitacora>> {
    const paginacion = leerPaginacion(entrada.pagina, entrada.limite);
    const { elementos, total } = await this.bitacora.listar(paginacion.pagina, paginacion.limite);
    return { elementos, total, ...paginacion };
  }
}
