import { ErrorValidacion } from '../../../dominio/compartido/errores';
import { EntradaHistorial as FilaHistorial } from '../../../dominio/deteccion/Estadisticas';
import { Paginado } from '../../dto/DtoComun';
import { DtoDeteccion } from '../../dto/DtoReconocimiento';
import { ConsultarHistorialPuerto } from '../../puertos/entrada/historial';
import { DtoConsultaHistorial } from '../../dto/DtoHistorial';
import { PuertoSalidaDeteccion, FiltroHistorial } from '../../puerto/salida/PuertoSalidaDeteccion';
import { PuertoSalidaGesto } from '../../puerto/salida/PuertoSalidaGesto';
import { leerPaginacion, leerRango } from '../comun';

/** Convierte una fila del historial en el DTO que ve el usuario. */
export function filaADto(fila: FilaHistorial): DtoDeteccion {
  const { idUsuario: _dueno, ...dto } = fila;
  return dto;
}

/**
 * Arma el filtro del historial. Lo comparten ConsultarHistorial y
 * ExportarHistorial para que ambos entiendan los filtros igual.
 */
export async function construirFiltro(
  gestos: PuertoSalidaGesto,
  entrada: { idUsuario: number; desde?: unknown; hasta?: unknown; gesto?: unknown },
  paginacion: { pagina: number; limite: number },
): Promise<FiltroHistorial> {
  const filtro: FiltroHistorial = { idUsuario: entrada.idUsuario, ...leerRango(entrada.desde, entrada.hasta), ...paginacion };
  if (entrada.gesto !== undefined && entrada.gesto !== '') {
    if (typeof entrada.gesto !== 'string') throw new ErrorValidacion('El filtro de gesto debe ser texto');
    const gesto = await gestos.buscarPorCodigo(entrada.gesto);
    if (!gesto) throw new ErrorValidacion(`El gesto "${entrada.gesto}" no existe`);
    filtro.idGesto = gesto.id;
  }
  return filtro;
}

/** RF-15 · Historial propio con filtros por fecha y por gesto, paginado. */
export class ConsultarHistorial implements ConsultarHistorialPuerto {
  constructor(
    private readonly gestos: PuertoSalidaGesto,
    private readonly detecciones: PuertoSalidaDeteccion,
  ) {}

  async ejecutar(entrada: DtoConsultaHistorial): Promise<Paginado<DtoDeteccion>> {
    const paginacion = leerPaginacion(entrada.pagina, entrada.limite);
    const filtro = await construirFiltro(this.gestos, entrada, paginacion);
    const { elementos, total } = await this.detecciones.historial(filtro);
    return { elementos: elementos.map(filaADto), total, ...paginacion };
  }
}
