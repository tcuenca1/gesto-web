import { NuevoUsuario, Rol, Usuario } from '../../../dominio/usuario/Usuario';
import { PuertoSalidaUsuario } from '../../../aplicacion/puerto/salida/PuertoSalidaUsuario';
import { ContextoOrm, orm } from '../../base_dato/ConexionSequelize';

interface FilaUsuario {
  id_usuario: number;
  nombre: string;
  correo: string;
  contrasena_hash: string;
  activo: boolean;
  fecha_registro: Date;
  ultimo_acceso: Date | null;
  version_token: number;
  rol: { nombre: Rol };
}

/** Columnas que se piden siempre: nunca SELECT *. */
const COLUMNAS = ['id_usuario', 'nombre', 'correo', 'contrasena_hash', 'activo', 'fecha_registro', 'ultimo_acceso', 'version_token'];

const aEntidad = (f: FilaUsuario) =>
  Usuario.reconstruir({
    id: f.id_usuario,
    nombre: f.nombre,
    correo: f.correo,
    contrasenaHash: f.contrasena_hash,
    rol: f.rol.nombre,
    activo: f.activo,
    fechaRegistro: f.fecha_registro,
    ultimoAcceso: f.ultimo_acceso,
    versionToken: f.version_token,
  });

/** Adaptador del puerto PuertoSalidaUsuario con el ORM Sequelize. */
export class AdapSalida_UsuarioSequelize extends PuertoSalidaUsuario {
  constructor(private readonly ctx: ContextoOrm) {
    super();
  }

  private get opciones() {
    const { Rol: rol } = this.ctx.modelos;
    // raw + nest: filas planas (rol.nombre queda como { rol: { nombre } }), sin instancias de modelo.
    return {
      attributes: COLUMNAS,
      include: [{ model: rol, as: 'rol', attributes: ['nombre'] }],
      raw: true,
      nest: true,
      transaction: this.ctx.transaccion,
    };
  }

  private async idDelRol(nombre: Rol): Promise<number> {
    const rol = (await this.ctx.modelos.Rol.findOne({
      attributes: ['id_rol'],
      where: { nombre },
      raw: true,
      transaction: this.ctx.transaccion,
    })) as { id_rol: number } | null;
    return rol!.id_rol;
  }

  async crear(nuevo: NuevoUsuario): Promise<Usuario> {
    return orm(async () => {
      // El trigger trg_asignaciones_iniciales crea sus 7 asignaciones.
      const creado = await this.ctx.modelos.Usuario.create(
        {
          nombre: nuevo.nombre,
          correo: nuevo.correo,
          contrasena_hash: nuevo.contrasenaHash,
          id_rol: await this.idDelRol(nuevo.rol),
        },
        { returning: ['id_usuario'], transaction: this.ctx.transaccion },
      );
      return (await this.buscarPorId(creado.get('id_usuario') as number))!;
    });
  }

  async buscarPorId(id: number): Promise<Usuario | null> {
    return orm(async () => {
      const fila = (await this.ctx.modelos.Usuario.findByPk(id, this.opciones)) as FilaUsuario | null;
      return fila ? aEntidad(fila) : null;
    });
  }

  async buscarPorCorreo(correo: string): Promise<Usuario | null> {
    return orm(async () => {
      const fila = (await this.ctx.modelos.Usuario.findOne({ where: { correo: correo.toLowerCase() }, ...this.opciones })) as FilaUsuario | null;
      return fila ? aEntidad(fila) : null;
    });
  }

  async listar(): Promise<Usuario[]> {
    return orm(async () => {
      const filas = (await this.ctx.modelos.Usuario.findAll({ order: [['id_usuario', 'ASC']], ...this.opciones })) as unknown as FilaUsuario[];
      return filas.map(aEntidad);
    });
  }

  async actualizar(usuario: Usuario): Promise<void> {
    await orm(async () => {
      await this.ctx.modelos.Usuario.update(
        {
          nombre: usuario.nombre,
          contrasena_hash: usuario.contrasenaHash,
          id_rol: await this.idDelRol(usuario.rol),
          activo: usuario.activo,
          ultimo_acceso: usuario.ultimoAcceso,
        },
        { where: { id_usuario: usuario.id }, transaction: this.ctx.transaccion },
      );
    });
  }

  async invalidarTokens(idUsuario: number): Promise<void> {
    // increment() genera "version_token = version_token + 1": atómico en la base.
    await orm(() =>
      this.ctx.modelos.Usuario.increment('version_token', { by: 1, where: { id_usuario: idUsuario }, transaction: this.ctx.transaccion }),
    );
  }

  async contar(): Promise<number> {
    return orm(() => this.ctx.modelos.Usuario.count({ transaction: this.ctx.transaccion }));
  }
}
