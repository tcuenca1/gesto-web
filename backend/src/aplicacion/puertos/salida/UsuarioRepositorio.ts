import { NuevoUsuario, Usuario } from '../../../dominio/usuario/Usuario';

/**
 * Puerto de salida: guardar y buscar usuarios.
 * El núcleo solo conoce este contrato; el adaptador decide si usa
 * PostgreSQL, memoria u otra cosa.
 */
export interface UsuarioRepositorio {
  crear(nuevo: NuevoUsuario): Promise<Usuario>;
  buscarPorId(id: number): Promise<Usuario | null>;
  buscarPorCorreo(correo: string): Promise<Usuario | null>;
  listar(): Promise<Usuario[]>;
  /** Guarda nombre, contraseña, rol, estado y último acceso. */
  actualizar(usuario: Usuario): Promise<void>;
  contar(): Promise<number>;
}
