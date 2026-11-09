import { Contenedores, crearContenedores } from '../src/contenedor';
import { PuertoSalidaReloj } from '../src/aplicacion/puerto/salida/PuertoSalidaReloj';
import { AlmacenMemoria } from '../src/infraestructura/base_dato/AlmacenMemoria';
import { datosInicialesMemoria } from '../src/infraestructura/base_dato/datosInicialesMemoria';
import { AdapSalida_CifradorBcrypt } from '../src/infraestructura/adaptadores/salida/AdapSalida_CifradorBcrypt';
import { AdapSalida_TokensJwt } from '../src/infraestructura/adaptadores/salida/AdapSalida_TokensJwt';
import { crearPersistenciaMemoria } from '../src/contenedor/ContenedorPersistencia';

/** Reloj falso: la hora la controla la prueba. */
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
  const persistencia = crearPersistenciaMemoria(reloj, almacen);
  const contenedores: Contenedores = crearContenedores({
    ...persistencia,
    cifrador: new AdapSalida_CifradorBcrypt(4),
    tokens: new AdapSalida_TokensJwt(SECRETO_PRUEBAS),
    reloj,
    zonaHoraria: 'America/Guayaquil',
  });
  return { contenedores, persistencia, almacen, reloj };
}

/** Registra un usuario y devuelve su id. */
export async function registrar(contenedores: Contenedores, correo = 'ana@correo.com'): Promise<number> {
  const u = await contenedores.usuario.cuEscritura.registrarUsuario({ nombre: 'Ana', correo, contrasena: 'Clave1234' });
  return u.id;
}
