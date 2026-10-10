import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Accion,
  Asignacion,
  Deteccion,
  EntradaBitacora,
  ErrorApi,
  Estadisticas,
  EstadisticasGenerales,
  FiltroHistorial,
  Gesto,
  NuevaDeteccion,
  Paginado,
  ResultadoLogin,
  SesionReconocimiento,
  Usuario,
} from '../../nucleo/dominio/modelos';
import { ApiGestoWeb } from '../../nucleo/puertos/api-gestoweb';

/**
 * Adaptador del puerto ApiGestoWeb con el cliente HTTP de Angular.
 * Convierte cada respuesta en una promesa y cada error en un ErrorApi con
 * un mensaje en español listo para mostrar. El token lo agrega el
 * interceptor (interceptor-token.ts).
 */
@Injectable()
export class ApiGestoWebHttp extends ApiGestoWeb {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  // ---------------- Autenticación ----------------
  iniciarSesion(correo: string, contrasena: string) {
    return this.pedir(this.http.post<ResultadoLogin>(`${this.base}/auth/login`, { correo, contrasena }));
  }
  registrarse(datos: { nombre: string; correo: string; contrasena: string }) {
    return this.pedir(this.http.post<Usuario>(`${this.base}/auth/registro`, datos));
  }
  perfil() {
    return this.pedir(this.http.get<Usuario>(`${this.base}/usuarios/yo`));
  }
  editarPerfil(datos: { nombre?: string; contrasenaActual?: string; contrasenaNueva?: string }) {
    return this.pedir(this.http.put<Usuario>(`${this.base}/usuarios/yo`, datos));
  }

  // ---------------- Catálogo y configuración ----------------
  gestos() {
    return this.pedir(this.http.get<Gesto[]>(`${this.base}/gestos`));
  }
  acciones() {
    return this.pedir(this.http.get<Accion[]>(`${this.base}/acciones`));
  }
  asignaciones() {
    return this.pedir(this.http.get<Asignacion[]>(`${this.base}/asignaciones`));
  }
  cambiarAsignacion(idGesto: number, idAccion: number) {
    return this.pedir(this.http.put<Asignacion>(`${this.base}/asignaciones/${idGesto}`, { idAccion }));
  }
  restaurarAsignaciones() {
    return this.pedir(this.http.post<Asignacion[]>(`${this.base}/asignaciones/restaurar`, {}));
  }

  // ---------------- Reconocimiento ----------------
  abrirSesion(navegador: string) {
    return this.pedir(this.http.post<SesionReconocimiento>(`${this.base}/sesiones`, { navegador }));
  }
  cerrarSesion(idSesion: number) {
    return this.pedir(this.http.patch<SesionReconocimiento>(`${this.base}/sesiones/${idSesion}/cerrar`, {}));
  }
  registrarDeteccion(idSesion: number, deteccion: NuevaDeteccion) {
    return this.pedir(this.http.post<Deteccion>(`${this.base}/sesiones/${idSesion}/detecciones`, deteccion));
  }

  // ---------------- Historial ----------------
  historial(filtro: FiltroHistorial) {
    return this.pedir(this.http.get<Paginado<Deteccion>>(`${this.base}/historial`, { params: parametros(filtro) }));
  }
  async descargarCsv(filtro: FiltroHistorial) {
    const respuesta = await this.pedir(
      this.http.get(`${this.base}/historial/csv`, {
        params: parametros({ ...filtro, zona: zonaDelNavegador() }),
        responseType: 'blob',
        observe: 'response',
      }),
    );
    const disposicion = respuesta.headers.get('content-disposition') ?? '';
    const nombreArchivo = /filename="([^"]+)"/.exec(disposicion)?.[1] ?? 'historial-gestoweb.csv';
    return { nombreArchivo, contenido: respuesta.body ?? new Blob() };
  }
  estadisticas(filtro: { desde?: string; hasta?: string }) {
    return this.pedir(
      this.http.get<Estadisticas>(`${this.base}/estadisticas`, { params: parametros({ ...filtro, zona: zonaDelNavegador() }) }),
    );
  }

  // ---------------- Administración ----------------
  gestosAdmin() {
    return this.pedir(this.http.get<Gesto[]>(`${this.base}/admin/gestos`));
  }
  editarGesto(id: number, cambios: Partial<Pick<Gesto, 'nombre' | 'descripcion' | 'umbralConfianza' | 'activo'>>) {
    return this.pedir(this.http.put<Gesto>(`${this.base}/admin/gestos/${id}`, cambios));
  }
  accionesAdmin() {
    return this.pedir(this.http.get<Accion[]>(`${this.base}/admin/acciones`));
  }
  crearAccion(datos: { codigo: string; nombre: string; descripcion?: string }) {
    return this.pedir(this.http.post<Accion>(`${this.base}/admin/acciones`, datos));
  }
  editarAccion(id: number, cambios: Partial<Pick<Accion, 'nombre' | 'descripcion' | 'activa'>>) {
    return this.pedir(this.http.put<Accion>(`${this.base}/admin/acciones/${id}`, cambios));
  }
  desactivarAccion(id: number) {
    return this.pedir(this.http.delete<Accion>(`${this.base}/admin/acciones/${id}`));
  }
  usuarios() {
    return this.pedir(this.http.get<Usuario[]>(`${this.base}/admin/usuarios`));
  }
  cambiarUsuario(id: number, cambios: { rol?: string; activo?: boolean }) {
    return this.pedir(this.http.patch<Usuario>(`${this.base}/admin/usuarios/${id}`, cambios));
  }
  estadisticasGenerales(filtro: { desde?: string }) {
    return this.pedir(
      this.http.get<EstadisticasGenerales>(`${this.base}/admin/estadisticas`, {
        params: parametros({ ...filtro, zona: zonaDelNavegador() }),
      }),
    );
  }
  bitacora(pagina: number, limite: number) {
    return this.pedir(this.http.get<Paginado<EntradaBitacora>>(`${this.base}/admin/bitacora`, { params: parametros({ pagina, limite }) }));
  }

  /** Observable → Promise, y HttpErrorResponse → ErrorApi. */
  private async pedir<T>(peticion: Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(peticion);
    } catch (error) {
      throw await aErrorApi(error);
    }
  }
}

function parametros(valores: { [clave: string]: string | number | undefined } | FiltroHistorial): HttpParams {
  let p = new HttpParams();
  for (const [clave, valor] of Object.entries(valores as Record<string, unknown>)) {
    if (valor !== undefined && valor !== '') p = p.set(clave, String(valor));
  }
  return p;
}

function zonaDelNavegador(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Guayaquil';
}

async function aErrorApi(error: unknown): Promise<ErrorApi> {
  if (!(error instanceof HttpErrorResponse)) return new ErrorApi(0, 'Ocurrió un error inesperado.');
  if (error.status === 0) return new ErrorApi(0, 'No se pudo conectar con el servidor. Revisa que el backend esté encendido.');
  let cuerpo = error.error;
  if (cuerpo instanceof Blob) {
    try {
      cuerpo = JSON.parse(await cuerpo.text());
    } catch {
      cuerpo = null;
    }
  }
  const detalle = (cuerpo as { error?: { codigo?: string; mensaje?: string } } | null)?.error;
  return new ErrorApi(error.status, detalle?.mensaje ?? `El servidor respondió con un error (${error.status}).`, detalle?.codigo ?? '');
}
