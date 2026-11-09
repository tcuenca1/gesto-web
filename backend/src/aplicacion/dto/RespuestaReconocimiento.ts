import { SesionReconocimiento } from '../../dominio/deteccion/SesionReconocimiento';
import { DtoSesion } from './DtoReconocimiento';

/** Quita el dueño de la sesión: el cliente ya sabe quién es. */
export function sesionARespuesta(s: SesionReconocimiento): DtoSesion {
  const { idUsuario: _dueno, ...datos } = s.aDatos();
  return datos;
}
