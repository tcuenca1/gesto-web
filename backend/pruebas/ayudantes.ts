import { crearCasosDeUso } from '../src/aplicacion/casos-uso';
import { CasosDeUso } from '../src/aplicacion/puertos/entrada';
import { PuertoSalidaReloj } from '../src/aplicacion/puerto/salida/PuertoSalidaReloj';
import { AlmacenMemoria } from '../src/infraestructura/base_dato/AlmacenMemoria';
import { datosInicialesMemoria } from '../src/infraestructura/base_dato/datosInicialesMemoria';
import { AdapSalida_CifradorBcrypt } from '../src/infraestructura/adaptadores/salida/AdapSalida_CifradorBcrypt';
import { AdapSalida_TokensJwt } from '../src/infraestructura/adaptadores/salida/AdapSalida_TokensJwt';
import { persistenciaMemoria } from '../src/main';

/** PuertoSalidaReloj falso: la hora la controla la prueba. */
export class RelojFalso implements PuertoSalidaReloj {
  constructor(public actual = new Date('2026-10-09T15:00:00Z')) {}
  ahora(): Date {
    return new Date(this.actual);
  }
  avanzar(ms: number): void {
    this.actual = new Date(this.actual.getTime() + ms);
  }
}

export const SECRETO_PRUEBAS = 'secreto-solo-para-las-pruebas-automaticas';
export const ADMIN = { correo: 'admin@gestoweb.local', contrasena: 'Admin123!' };

/**
 * Arma el núcleo completo con adaptadores en memoria.
 * bcrypt con costo 4 para que las pruebas sean rápidas.
 */
export function entornoMemoria(reloj = new RelojFalso()) {
  const almacen = new AlmacenMemoria(datosInicialesMemoria(reloj.ahora()));
  const persistencia = persistenciaMemoria(reloj, almacen);
  const casos: CasosDeUso = crearCasosDeUso({
    ...persistencia,
    cifrador: new AdapSalida_CifradorBcrypt(4),
    tokens: new AdapSalida_TokensJwt(SECRETO_PRUEBAS),
    reloj,
    zonaHoraria: 'America/Guayaquil',
  });
  return { casos, persistencia, almacen, reloj };
}

/** Registra un usuario y devuelve su id. */
export async function registrar(casos: CasosDeUso, correo = 'ana@correo.com'): Promise<number> {
  const u = await casos.usuarios.registrar.ejecutar({ nombre: 'Ana', correo, contrasena: 'Clave1234' });
  return u.id;
}
