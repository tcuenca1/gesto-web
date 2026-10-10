import { NuevoUsuario, Rol, Usuario } from '../../../dominio/usuario/Usuario';
import { UsuarioRepositorio } from '../../../aplicacion/puertos/salida/UsuarioRepositorio';
import { consultar, Consultor } from './conexion';

interface FilaUsuario {
  id_usuario: number;
  nombre: string;
  correo: string;
  contrasena_hash: string;
  rol: Rol;
  activo: boolean;
  fecha_registro: Date;
  ultimo_acceso: Date | null;
}

const SELECCION = `
  SELECT u.id_usuario, u.nombre, u.correo, u.contrasena_hash, r.nombre AS rol,
         u.activo, u.fecha_registro, u.ultimo_acceso
    FROM usuarios u
    JOIN roles r ON r.id_rol = u.id_rol`;

const aEntidad = (f: FilaUsuario) =>
  Usuario.reconstruir({
    id: f.id_usuario,
    nombre: f.nombre,
    correo: f.correo,
    contrasenaHash: f.contrasena_hash,
    rol: f.rol,
    activo: f.activo,
    fechaRegistro: f.fecha_registro,
    ultimoAcceso: f.ultimo_acceso,
  });

/** Adaptador PostgreSQL del puerto UsuarioRepositorio. */
export class UsuarioRepositorioPg implements UsuarioRepositorio {
  constructor(private readonly bd: Consultor) {}

  async crear(nuevo: NuevoUsuario): Promise<Usuario> {
    // El trigger trg_asignaciones_iniciales crea sus 7 asignaciones.
    const { rows } = await consultar<{ id_usuario: number }>(
      this.bd,
      `INSERT INTO usuarios (nombre, correo, contrasena_hash, id_rol)
       VALUES ($1, $2, $3, (SELECT id_rol FROM roles WHERE nombre = $4))
       RETURNING id_usuario`,
      [nuevo.nombre, nuevo.correo, nuevo.contrasenaHash, nuevo.rol],
    );
    return (await this.buscarPorId(rows[0].id_usuario))!;
  }

  async buscarPorId(id: number): Promise<Usuario | null> {
    const { rows } = await consultar<FilaUsuario>(this.bd, `${SELECCION} WHERE u.id_usuario = $1`, [id]);
    return rows[0] ? aEntidad(rows[0]) : null;
  }

  async buscarPorCorreo(correo: string): Promise<Usuario | null> {
    const { rows } = await consultar<FilaUsuario>(this.bd, `${SELECCION} WHERE u.correo = $1`, [correo.toLowerCase()]);
    return rows[0] ? aEntidad(rows[0]) : null;
  }

  async listar(): Promise<Usuario[]> {
    const { rows } = await consultar<FilaUsuario>(this.bd, `${SELECCION} ORDER BY u.id_usuario`);
    return rows.map(aEntidad);
  }

  async actualizar(usuario: Usuario): Promise<void> {
    await consultar(
      this.bd,
      `UPDATE usuarios
          SET nombre = $2, contrasena_hash = $3,
              id_rol = (SELECT id_rol FROM roles WHERE nombre = $4),
              activo = $5, ultimo_acceso = $6
        WHERE id_usuario = $1`,
      [usuario.id, usuario.nombre, usuario.contrasenaHash, usuario.rol, usuario.activo, usuario.ultimoAcceso],
    );
  }

  async contar(): Promise<number> {
    const { rows } = await consultar<{ total: number }>(this.bd, 'SELECT COUNT(*) AS total FROM usuarios');
    return rows[0].total;
  }
}
