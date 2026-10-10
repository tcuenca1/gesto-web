/**
 * Utilidades compartidas por los casos de uso: lectura de parámetros
 * y conversión de entidades a DTO.
 */
import { Accion } from '../../dominio/accion/Accion';
import { ErrorValidacion } from '../../dominio/compartido/errores';
import { RangoFechas, validarRango, validarZonaHoraria } from '../../dominio/deteccion/Estadisticas';
import { SesionReconocimiento } from '../../dominio/deteccion/SesionReconocimiento';
import { Gesto } from '../../dominio/gesto/Gesto';
import { AccionDTO, GestoDTO, SesionDTO } from '../puertos/entrada/dtos';

// ---------------------------------------------------------------------
// Lectura de parámetros
// ---------------------------------------------------------------------

export function leerEnteroPositivo(valor: unknown, nombre: string): number {
  const numero = typeof valor === 'string' && valor.trim() !== '' ? Number(valor) : valor;
  if (typeof numero !== 'number' || !Number.isInteger(numero) || numero < 1) {
    throw new ErrorValidacion(`"${nombre}" debe ser un número entero positivo`);
  }
  return numero;
}

export function leerFechaOpcional(valor: unknown, nombre: string): Date | undefined {
  if (valor === undefined || valor === null || valor === '') return undefined;
  if (typeof valor !== 'string' && !(valor instanceof Date)) {
    throw new ErrorValidacion(`"${nombre}" debe ser una fecha`);
  }
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) throw new ErrorValidacion(`"${nombre}" no es una fecha válida`);
  return fecha;
}

export function leerRango(desde: unknown, hasta: unknown): RangoFechas {
  return validarRango({ desde: leerFechaOpcional(desde, 'desde'), hasta: leerFechaOpcional(hasta, 'hasta') });
}

export function leerZona(valor: unknown, porDefecto: string): string {
  if (valor === undefined || valor === null || valor === '') return porDefecto;
  if (typeof valor !== 'string') throw new ErrorValidacion('La zona horaria debe ser texto');
  return validarZonaHoraria(valor);
}

export function leerPaginacion(
  pagina: unknown,
  limite: unknown,
  opciones = { porDefecto: 20, maximo: 100 },
): { pagina: number; limite: number } {
  const p = pagina === undefined || pagina === '' ? 1 : leerEnteroPositivo(pagina, 'pagina');
  const l = limite === undefined || limite === '' ? opciones.porDefecto : leerEnteroPositivo(limite, 'limite');
  return { pagina: p, limite: Math.min(l, opciones.maximo) };
}

// ---------------------------------------------------------------------
// Entidades → DTO
// ---------------------------------------------------------------------

export function gestoADto(g: Gesto): GestoDTO {
  return g.aDatos();
}

export function accionADto(a: Accion): AccionDTO {
  return a.aDatos();
}

export function sesionADto(s: SesionReconocimiento): SesionDTO {
  const { idUsuario: _dueno, ...datos } = s.aDatos();
  return datos;
}
