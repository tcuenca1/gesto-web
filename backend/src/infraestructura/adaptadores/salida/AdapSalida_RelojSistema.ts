import { PuertoSalidaReloj } from '../../../aplicacion/puerto/salida/PuertoSalidaReloj';

/** Adaptador del puerto PuertoSalidaReloj: la hora real del servidor. */
export class AdapSalida_RelojSistema extends PuertoSalidaReloj {
  ahora(): Date {
    return new Date();
  }
}
