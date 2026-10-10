/**
 * Adaptadores en memoria: cumplen los mismos puertos que los de PostgreSQL.
 * Si el núcleo funciona igual con unos u otros, la arquitectura hexagonal
 * está bien aplicada (prueba P-09, principio de sustitución de Liskov).
 */
import { Accion, NuevaAccion } from '../../../dominio/accion/Accion';
import { Asignacion } from '../../../dominio/accion/Asignacion';
import { ErrorConflicto } from '../../../dominio/compartido/errores';
import { Deteccion, NuevaDeteccion } from '../../../dominio/deteccion/Deteccion';
import { EntradaHistorial, RangoFechas, TotalPorGesto, UsoPorDia } from '../../../dominio/deteccion/Estadisticas';
import { SesionReconocimiento } from '../../../dominio/deteccion/SesionReconocimiento';
import { Gesto } from '../../../dominio/gesto/Gesto';
import { NuevoUsuario, Usuario } from '../../../dominio/usuario/Usuario';
import { AccionRepositorio } from '../../../aplicacion/puertos/salida/AccionRepositorio';
import { AsignacionRepositorio } from '../../../aplicacion/puertos/salida/AsignacionRepositorio';
import { BitacoraRepositorio, EntradaBitacora, NuevaEntradaBitacora } from '../../../aplicacion/puertos/salida/BitacoraRepositorio';
import {
  DeteccionRepositorio,
  FiltroHistorial,
  PaginaHistorial,
  UsoGeneralPorGesto,
} from '../../../aplicacion/puertos/salida/DeteccionRepositorio';
import { GestoRepositorio } from '../../../aplicacion/puertos/salida/GestoRepositorio';
import { SesionRepositorio } from '../../../aplicacion/puertos/salida/SesionRepositorio';
import { Reloj } from '../../../aplicacion/puertos/salida/servicios';
import { RepositoriosTransaccionales, UnidadDeTrabajo } from '../../../aplicacion/puertos/salida/UnidadDeTrabajo';
import { UsuarioRepositorio } from '../../../aplicacion/puertos/salida/UsuarioRepositorio';
import { AlmacenMemoria } from './AlmacenMemoria';

const redondear = (n: number, decimales = 3) => Math.round(n * 10 ** decimales) / 10 ** decimales;

export class UsuarioRepositorioMemoria implements UsuarioRepositorio {
  constructor(private readonly almacen: AlmacenMemoria, private readonly reloj: Reloj) {}

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

export class GestoRepositorioMemoria implements GestoRepositorio {
  constructor(private readonly almacen: AlmacenMemoria) {}

  async listar(opciones: { soloActivos?: boolean } = {}): Promise<Gesto[]> {
    return this.almacen.estado.gestos
      .filter((g) => !opciones.soloActivos || g.activo)
      .sort((a, b) => a.id - b.id)
      .map(Gesto.reconstruir);
  }

  async buscarPorId(id: number): Promise<Gesto | null> {
    const datos = this.almacen.estado.gestos.find((g) => g.id === id);
    return datos ? Gesto.reconstruir(datos) : null;
  }

  async buscarPorCodigo(codigo: string): Promise<Gesto | null> {
    const datos = this.almacen.estado.gestos.find((g) => g.codigo === codigo);
    return datos ? Gesto.reconstruir(datos) : null;
  }

  async actualizar(gesto: Gesto): Promise<void> {
    const lista = this.almacen.estado.gestos;
    const i = lista.findIndex((g) => g.id === gesto.id);
    if (i >= 0) lista[i] = gesto.aDatos();
  }
}

export class AccionRepositorioMemoria implements AccionRepositorio {
  constructor(private readonly almacen: AlmacenMemoria) {}

  async listar(opciones: { soloActivas?: boolean } = {}): Promise<Accion[]> {
    return this.almacen.estado.acciones
      .filter((a) => !opciones.soloActivas || a.activa)
      .sort((a, b) => a.id - b.id)
      .map(Accion.reconstruir);
  }

  async buscarPorId(id: number): Promise<Accion | null> {
    const datos = this.almacen.estado.acciones.find((a) => a.id === id);
    return datos ? Accion.reconstruir(datos) : null;
  }

  async buscarPorCodigo(codigo: string): Promise<Accion | null> {
    const datos = this.almacen.estado.acciones.find((a) => a.codigo === codigo);
    return datos ? Accion.reconstruir(datos) : null;
  }

  async crear(nueva: NuevaAccion): Promise<Accion> {
    if (this.almacen.estado.acciones.some((a) => a.codigo === nueva.codigo)) {
      throw new ErrorConflicto(`Ya existe una acción con el código ${nueva.codigo}`);
    }
    const datos = { ...nueva, id: this.almacen.siguienteId('acciones'), activa: true };
    this.almacen.estado.acciones.push(datos);
    return Accion.reconstruir(datos);
  }

  async actualizar(accion: Accion): Promise<void> {
    const lista = this.almacen.estado.acciones;
    const i = lista.findIndex((a) => a.id === accion.id);
    if (i >= 0) lista[i] = accion.aDatos();
  }

  async esPredeterminadaDeAlgunGesto(idAccion: number): Promise<boolean> {
    return this.almacen.estado.gestos.some((g) => g.idAccionPredeterminada === idAccion);
  }
}

export class AsignacionRepositorioMemoria implements AsignacionRepositorio {
  constructor(private readonly almacen: AlmacenMemoria, private readonly reloj: Reloj) {}

  async listarDeUsuario(idUsuario: number): Promise<Asignacion[]> {
    return this.almacen.estado.asignaciones.filter((a) => a.idUsuario === idUsuario).map((a) => ({ ...a }));
  }

  async guardar(idUsuario: number, idGesto: number, idAccion: number): Promise<Asignacion> {
    const lista = this.almacen.estado.asignaciones;
    const nueva = { idUsuario, idGesto, idAccion, fechaActualizacion: this.reloj.ahora() };
    const i = lista.findIndex((a) => a.idUsuario === idUsuario && a.idGesto === idGesto);
    if (i >= 0) lista[i] = nueva;
    else lista.push(nueva);
    return { ...nueva };
  }

  async restaurar(idUsuario: number): Promise<void> {
    for (const g of this.almacen.estado.gestos) {
      await this.guardar(idUsuario, g.id, g.idAccionPredeterminada);
    }
  }
}

export class SesionRepositorioMemoria implements SesionRepositorio {
  constructor(private readonly almacen: AlmacenMemoria, private readonly reloj: Reloj) {}

  async abrir(idUsuario: number, navegador: string | null): Promise<SesionReconocimiento> {
    const e = this.almacen.estado;
    // Imita sp_abrir_sesion: cierra las abiertas con la hora de su última detección.
    for (const s of e.sesiones.filter((s) => s.idUsuario === idUsuario && s.fechaFin === null)) {
      const ultimas = e.detecciones.filter((d) => d.idSesion === s.id).map((d) => d.fechaHora.getTime());
      s.fechaFin = new Date(Math.max(s.fechaInicio.getTime(), ...ultimas));
    }
    const datos = {
      id: this.almacen.siguienteId('sesiones'),
      idUsuario,
      fechaInicio: this.reloj.ahora(),
      fechaFin: null,
      navegador,
      totalDetecciones: 0,
    };
    e.sesiones.push(datos);
    return SesionReconocimiento.reconstruir(datos);
  }

  async buscarPorId(id: number): Promise<SesionReconocimiento | null> {
    const datos = this.almacen.estado.sesiones.find((s) => s.id === id);
    return datos ? SesionReconocimiento.reconstruir(datos) : null;
  }

  async cerrar(sesion: SesionReconocimiento): Promise<void> {
    const datos = this.almacen.estado.sesiones.find((s) => s.id === sesion.id);
    if (datos) datos.fechaFin = sesion.fechaFin;
  }

  async contar(): Promise<number> {
    return this.almacen.estado.sesiones.length;
  }
}

export class DeteccionRepositorioMemoria implements DeteccionRepositorio {
  constructor(private readonly almacen: AlmacenMemoria) {}

  async guardar(nueva: NuevaDeteccion): Promise<Deteccion> {
    const e = this.almacen.estado;
    const sesion = e.sesiones.find((s) => s.id === nueva.idSesion);
    // Imita trg_validar_sesion_abierta y trg_contar_detecciones.
    if (!sesion || sesion.fechaFin !== null) throw new ErrorConflicto('La sesión de reconocimiento ya está cerrada', 'SESION_CERRADA');
    const deteccion = { ...nueva, id: this.almacen.siguienteId('detecciones') };
    e.detecciones.push(deteccion);
    sesion.totalDetecciones += 1;
    return { ...deteccion };
  }

  async historial(filtro: FiltroHistorial): Promise<PaginaHistorial> {
    const filas = this.filas(filtro.idUsuario, filtro)
      .filter((f) => filtro.idGesto === undefined || f.idGesto === filtro.idGesto)
      .sort((a, b) => b.fechaHora.getTime() - a.fechaHora.getTime() || b.id - a.id);
    const inicio = (filtro.pagina - 1) * filtro.limite;
    return {
      total: filas.length,
      elementos: filas.slice(inicio, inicio + filtro.limite).map(({ idGesto: _g, ...fila }) => fila),
    };
  }

  async totalesPorGesto(idUsuario: number | null, rango: RangoFechas): Promise<TotalPorGesto[]> {
    const filas = this.filas(idUsuario, rango);
    return [...this.almacen.estado.gestos]
      .sort((a, b) => a.id - b.id)
      .map((g) => {
        const delGesto = filas.filter((f) => f.idGesto === g.id);
        const suma = delGesto.reduce((s, f) => s + f.confianza, 0);
        return {
          idGesto: g.id,
          codigo: g.codigo,
          nombre: g.nombre,
          total: delGesto.length,
          confianzaPromedio: delGesto.length ? redondear(suma / delGesto.length) : 0,
        };
      });
  }

  async usoPorDia(idUsuario: number | null, rango: RangoFechas, zonaHoraria: string): Promise<UsoPorDia[]> {
    const formato = new Intl.DateTimeFormat('en-CA', { timeZone: zonaHoraria, year: 'numeric', month: '2-digit', day: '2-digit' });
    const conteo = new Map<string, number>();
    for (const f of this.filas(idUsuario, rango)) {
      const dia = formato.format(f.fechaHora);
      conteo.set(dia, (conteo.get(dia) ?? 0) + 1);
    }
    return [...conteo].map(([dia, total]) => ({ dia, total })).sort((a, b) => a.dia.localeCompare(b.dia));
  }

  async usoGeneral(): Promise<UsoGeneralPorGesto[]> {
    const totales = await this.totalesPorGesto(null, {});
    const filas = this.filas(null, {});
    return totales.map((t) => ({
      ...t,
      activo: this.almacen.estado.gestos.find((g) => g.id === t.idGesto)?.activo ?? false,
      usuariosDistintos: new Set(filas.filter((f) => f.idGesto === t.idGesto).map((f) => f.idUsuario)).size,
    }));
  }

  async contar(): Promise<number> {
    return this.almacen.estado.detecciones.length;
  }

  /** Equivalente a la vista v_historial, filtrada por usuario y fechas. */
  private filas(idUsuario: number | null, rango: RangoFechas): Array<EntradaHistorial & { idGesto: number }> {
    const e = this.almacen.estado;
    return e.detecciones.flatMap((d) => {
      const sesion = e.sesiones.find((s) => s.id === d.idSesion);
      if (!sesion || (idUsuario !== null && sesion.idUsuario !== idUsuario)) return [];
      if (rango.desde && d.fechaHora < rango.desde) return [];
      if (rango.hasta && d.fechaHora >= rango.hasta) return [];
      const gesto = e.gestos.find((g) => g.id === d.idGesto);
      const accion = e.acciones.find((a) => a.id === d.idAccion);
      return [{
        id: d.id,
        idSesion: d.idSesion,
        idUsuario: sesion.idUsuario,
        idGesto: d.idGesto,
        codigoGesto: gesto?.codigo ?? '',
        nombreGesto: gesto?.nombre ?? '',
        codigoAccion: accion?.codigo ?? null,
        nombreAccion: accion?.nombre ?? null,
        confianza: d.confianza,
        mano: d.mano,
        fechaHora: d.fechaHora,
      }];
    });
  }
}

export class BitacoraRepositorioMemoria implements BitacoraRepositorio {
  constructor(private readonly almacen: AlmacenMemoria, private readonly reloj: Reloj) {}

  async registrar(entrada: NuevaEntradaBitacora): Promise<void> {
    this.almacen.estado.bitacora.push({
      ...structuredClone(entrada),
      id: this.almacen.siguienteId('bitacora'),
      fechaHora: this.reloj.ahora(),
    });
  }

  async listar(pagina: number, limite: number): Promise<{ elementos: EntradaBitacora[]; total: number }> {
    const e = this.almacen.estado;
    const ordenadas = [...e.bitacora].sort((a, b) => b.id - a.id);
    const inicio = (pagina - 1) * limite;
    return {
      total: ordenadas.length,
      elementos: ordenadas.slice(inicio, inicio + limite).map((f) => ({
        ...f,
        nombreUsuario: e.usuarios.find((u) => u.id === f.idUsuario)?.nombre ?? '',
      })),
    };
  }
}

/**
 * Transacción en memoria: guarda una copia del estado y, si algo falla,
 * la restaura. Mismo comportamiento "todo o nada" que BEGIN/ROLLBACK.
 */
export class UnidadDeTrabajoMemoria implements UnidadDeTrabajo {
  constructor(private readonly almacen: AlmacenMemoria, private readonly repos: RepositoriosTransaccionales) {}

  async ejecutar<T>(trabajo: (repos: RepositoriosTransaccionales) => Promise<T>): Promise<T> {
    const copia = this.almacen.instantanea();
    try {
      return await trabajo(this.repos);
    } catch (error) {
      this.almacen.restaurar(copia);
      throw error;
    }
  }
}
