/** Puerto de salida: cifrar y comparar contraseñas (adaptador: bcrypt). */
export abstract class PuertoSalidaCifrador {
  abstract cifrar(contrasena: string): Promise<string>;
  abstract comparar(contrasena: string, hash: string): Promise<boolean>;
}
