import { ErrorConflicto } from '../../../dominio/compartido/errores';
import { NuevoUsuario, Usuario } from '../../../dominio/usuario/Usuario';
import { PuertoSalidaReloj } from '../../../aplicacion/puerto/salida/PuertoSalidaReloj';
import { PuertoSalidaUsuario } from '../../../aplicacion/puerto/salida/PuertoSalidaUsuario';
import { AlmacenMemoria } from '../../base_dato/AlmacenMemoria';

/** Adaptador en memoria de PuertoSalidaUsuario (pruebas y P-09). */
export class AdapSalida_UsuarioMemoria extends PuertoSalidaUsuario {
  constructor(private readonly almacen: AlmacenMemoria, private readonly reloj: PuertoSalidaReloj) {
    super();
  }

  async crear(nuevo: NuevoUsuario): Promise<Usuario> {
    const e = this.almacen.estado;
    if (e.usuarios.some((u) => u.correo === nuevo.correo)) throw new ErrorConflicto('Ya existe una cuenta con ese correo');
    const ahora = this.reloj.ahora();
    const datos = { ...nuevo, id: this.almacen.siguienteId('usuarios'), activo: true, fechaRegistro: ahora, ultimoAcceso: null };
    e.usuarios.push(datos);
    // Imita el trigger trg_asignaciones_iniciales de PostgreSQL.
    for (const g of e.gestos) {
      e.asignaciones.push({ idUsuario: datos.id, idGesto: g.id, idAccion: g.idAccionPredeterminada, fechaActualizacion: ahora });
    }
    return Usuario.reconstruir(datos);
  }

  async buscarPorId(id: number): Promise<Usuario | null> {
    const datos = this.almacen.estado.usuarios.find((u) => u.id === id);
    return datos ? Usuario.reconstruir(datos) : null;
  }

  async buscarPorCorreo(correo: string): Promise<Usuario | null> {
    const datos = this.almacen.estado.usuarios.find((u) => u.correo === correo.toLowerCase());
    return datos ? Usuario.reconstruir(datos) : null;
  }

  async listar(): Promise<Usuario[]> {
    return [...this.almacen.estado.usuarios].sort((a, b) => a.id - b.id).map(Usuario.reconstruir);
  }

  async actualizar(usuario: Usuario): Promise<void> {
    const lista = this.almacen.estado.usuarios;
    const i = lista.findIndex((u) => u.id === usuario.id);
    if (i >= 0) lista[i] = usuario.aDatos();
  }

  async contar(): Promise<number> {
    return this.almacen.estado.usuarios.length;
  }
}
