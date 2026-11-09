import { resumirEstadisticas } from '../../../dominio/deteccion/Estadisticas';
import { UsuarioPublico } from '../../../dominio/usuario/Usuario';
import { DtoConsultaEstadisticasGenerales, DtoEstadisticasGenerales } from '../../dto/DtoAdministracion';
import { Paginado } from '../../dto/DtoComun';
import { usuarioARespuesta } from '../../dto/RespuestaUsuario';
import { PuertoEntradaAdministracionLectura } from '../../puerto/entrada/PuertoEntradaAdministracionLectura';
import { EntradaBitacora, PuertoSalidaBitacora } from '../../puerto/salida/PuertoSalidaBitacora';
import { PuertoSalidaDeteccion } from '../../puerto/salida/PuertoSalidaDeteccion';
import { PuertoSalidaSesion } from '../../puerto/salida/PuertoSalidaSesion';
import { PuertoSalidaUsuario } from '../../puerto/salida/PuertoSalidaUsuario';
import { leerPaginacion, leerRango, leerZona } from '../comun';

/** Consultas del administrador. */
export class CasoUso_AdministracionLectura extends PuertoEntradaAdministracionLectura {
  constructor(
    private readonly usuarios: PuertoSalidaUsuario,
    private readonly sesiones: PuertoSalidaSesion,
    private readonly detecciones: PuertoSalidaDeteccion,
    private readonly bitacora: PuertoSalidaBitacora,
    private readonly zonaPorDefecto: string,
  ) {
    super();
  }

  /** RF-20 · El administrador ve la lista de usuarios. */
  async listarUsuarios(): Promise<UsuarioPublico[]> {
    return (await this.usuarios.listar()).map(usuarioARespuesta);
  }

  /**
   * RF-21 · Estadísticas de todo el sistema para el administrador.
   * Los totales y el uso por gesto son históricos (vista v_estadisticas_generales);
   * el rango de fechas solo limita el gráfico de uso por día.
   */
  async consultarEstadisticasGenerales(dto: DtoConsultaEstadisticasGenerales): Promise<DtoEstadisticasGenerales> {
    const zona = leerZona(dto.zonaHoraria, this.zonaPorDefecto);
    const rango = leerRango(dto.desde, dto.hasta);
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

  /** RF-22 · Ver la bitácora de cambios del administrador. */
  async consultarBitacora(dto: { pagina?: unknown; limite?: unknown }): Promise<Paginado<EntradaBitacora>> {
    const paginacion = leerPaginacion(dto.pagina, dto.limite);
    const { elementos, total } = await this.bitacora.listar(paginacion.pagina, paginacion.limite);
    return { elementos, total, ...paginacion };
  }
}
