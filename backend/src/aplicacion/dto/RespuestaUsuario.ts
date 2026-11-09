import { Usuario, UsuarioPublico } from '../../dominio/usuario/Usuario';

/** Lo único que sale de un usuario: nunca incluye contrasenaHash. */
export function usuarioARespuesta(u: Usuario): UsuarioPublico {
  return u.aPublico();
}
