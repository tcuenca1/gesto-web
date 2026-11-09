import { NuevoUsuario, Usuario } from '../../../dominio/usuario/Usuario';

/**
 * Puerto de salida: guardar y buscar usuarios.
 * El núcleo solo conoce este contrato; el adaptador decide si usa
 * PostgreSQL, memoria u otra cosa.
 */
export abstract class PuertoSalidaUsuario {
  abstract crear(nuevo: NuevoUsuario): Promise<Usuario>;
  abstract buscarPorId(id: number): Promise<Usuario | null>;
  abstract buscarPorCorreo(correo: string): Promise<Usuario | null>;
  abstract listar(): Promise<Usuario[]>;
  /** Guarda nombre, contraseña, rol, estado y último acceso. */
  abstract actualizar(usuario: Usuario): Promise<void>;
  abstract contar(): Promise<number>;
}
