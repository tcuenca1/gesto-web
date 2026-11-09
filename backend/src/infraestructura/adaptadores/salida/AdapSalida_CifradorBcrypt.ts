import bcrypt from 'bcryptjs';
import { PuertoSalidaCifrador } from '../../../aplicacion/puerto/salida/PuertoSalidaCifrador';

/**
 * Adaptador del puerto PuertoSalidaCifrador con bcrypt (RNF-06).
 *
 * Usamos "bcryptjs": implementa el mismo algoritmo bcrypt (hashes $2b$
 * compatibles) pero en JavaScript puro, así se instala en Windows sin
 * compiladores de C++. Si algún día se quiere el paquete nativo "bcrypt",
 * solo cambia este archivo.
 */
export class AdapSalida_CifradorBcrypt extends PuertoSalidaCifrador {
  constructor(private readonly costo = 10) {
    super();
  }

  cifrar(contrasena: string): Promise<string> {
    return bcrypt.hash(contrasena, this.costo);
  }

  comparar(contrasena: string, hash: string): Promise<boolean> {
    return bcrypt.compare(contrasena, hash);
  }
}
