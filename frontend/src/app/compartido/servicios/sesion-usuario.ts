import { computed, Injectable, signal } from '@angular/core';
import { ResultadoLogin, Usuario } from '../../nucleo/dominio/modelos';

const CLAVE = 'gestoweb.sesion';

interface SesionGuardada {
  token: string;
  expiraEn: string;
  usuario: Usuario;
}

/**
 * Quién inició sesión (RF-02). Guarda el token en el navegador para que la
 * sesión sobreviva a una recarga, y lo olvida al vencer (8 horas, RNF-07).
 */
@Injectable({ providedIn: 'root' })
export class SesionUsuario {
  private readonly datos = signal<SesionGuardada | null>(leer());

  readonly usuario = computed(() => this.datos()?.usuario ?? null);
  readonly token = computed(() => this.datos()?.token ?? null);
  readonly autenticado = computed(() => this.datos() !== null);
  readonly esAdmin = computed(() => this.datos()?.usuario.rol === 'ADMIN');

  iniciar(resultado: ResultadoLogin): void {
    const sesion = { token: resultado.token, expiraEn: resultado.expiraEn, usuario: resultado.usuario };
    this.datos.set(sesion);
    guardar(sesion);
  }

  actualizarUsuario(usuario: Usuario): void {
    const actual = this.datos();
    if (!actual) return;
    const sesion = { ...actual, usuario };
    this.datos.set(sesion);
    guardar(sesion);
  }

  /** RF-03: cerrar sesión. Con JWT basta con olvidar el token. */
  cerrar(): void {
    this.datos.set(null);
    try {
      localStorage.removeItem(CLAVE);
    } catch {
      /* almacenamiento no disponible */
    }
  }

  /** ¿El token ya venció? Se revisa al cambiar de página. */
  vencida(): boolean {
    const d = this.datos();
    return !!d && new Date(d.expiraEn).getTime() <= Date.now();
  }
}

function leer(): SesionGuardada | null {
  try {
    const texto = localStorage.getItem(CLAVE);
    if (!texto) return null;
    const sesion = JSON.parse(texto) as SesionGuardada;
    return new Date(sesion.expiraEn).getTime() > Date.now() ? sesion : null;
  } catch {
    return null;
  }
}

function guardar(sesion: SesionGuardada): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(sesion));
  } catch {
    /* modo privado: la sesión dura lo que dure la pestaña */
  }
}
