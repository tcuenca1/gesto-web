import { PuertoSalidaReloj } from '../../aplicacion/puerto/salida/PuertoSalidaReloj';

/** Adaptador del puerto PuertoSalidaReloj: la hora real del servidor. */
export class RelojSistema implements PuertoSalidaReloj {
  ahora(): Date {
    return new Date();
  }
}
