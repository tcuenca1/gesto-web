import { ErrorValidacion } from '../../../dominio/compartido/errores';
import { EntradaHistorial as FilaHistorial } from '../../../dominio/deteccion/Estadisticas';
import { Paginado } from '../../puertos/entrada/CasoDeUso';
import { DeteccionDTO } from '../../puertos/entrada/dtos';
import { ConsultarHistorialPuerto, EntradaHistorial } from '../../puertos/entrada/historial';
import { DeteccionRepositorio, FiltroHistorial } from '../../puertos/salida/DeteccionRepositorio';
import { GestoRepositorio } from '../../puertos/salida/GestoRepositorio';
import { leerPaginacion, leerRango } from '../comun';

/** Convierte una fila del historial en el DTO que ve el usuario. */
export function filaADto(fila: FilaHistorial): DeteccionDTO {
  const { idUsuario: _dueno, ...dto } = fila;
  return dto;
}

/**
 * Arma el filtro del historial. Lo comparten ConsultarHistorial y
 * ExportarHistorial para que ambos entiendan los filtros igual.
 */
export async function construirFiltro(
  gestos: GestoRepositorio,
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
    private readonly gestos: GestoRepositorio,
    private readonly detecciones: DeteccionRepositorio,
  ) {}

  async ejecutar(entrada: EntradaHistorial): Promise<Paginado<DeteccionDTO>> {
    const paginacion = leerPaginacion(entrada.pagina, entrada.limite);
    const filtro = await construirFiltro(this.gestos, entrada, paginacion);
    const { elementos, total } = await this.detecciones.historial(filtro);
    return { elementos: elementos.map(filaADto), total, ...paginacion };
  }
}
