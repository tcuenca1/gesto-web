import { Accion } from '../../dominio/accion/Accion';
import { Gesto } from '../../dominio/gesto/Gesto';
import { DtoAccion, DtoGesto } from './DtoAccion';

export function gestoARespuesta(g: Gesto): DtoGesto {
  return g.aDatos();
}

export function accionARespuesta(a: Accion): DtoAccion {
  return a.aDatos();
}
