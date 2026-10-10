import { Reloj } from '../../aplicacion/puertos/salida/servicios';

/** Adaptador del puerto Reloj: la hora real del servidor. */
export class RelojSistema implements Reloj {
  ahora(): Date {
    return new Date();
  }
}
