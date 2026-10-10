import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Avisos } from './compartido/servicios/avisos';
import { SesionUsuario } from './compartido/servicios/sesion-usuario';
import { MODO_SIMULADO } from './compartido/modo-simulado';

/** Estructura común: barra superior, contenido de la página y avisos. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <a class="saltar" href="#contenido">Saltar al contenido</a>
    <header class="barra">
      <div class="barra__interior">
        <a class="marca" routerLink="/" aria-label="GestoWeb, inicio">
          <span class="marca__mano" aria-hidden="true">✋</span>
          <span>GestoWeb</span>
        </a>

        <nav class="menu" aria-label="Principal">
          @if (sesion.autenticado()) {
            <a routerLink="/reconocer" routerLinkActive="activo">Reconocer</a>
            <a routerLink="/configuracion" routerLinkActive="activo">Mis gestos</a>
            <a routerLink="/historial" routerLinkActive="activo">Historial</a>
            <a routerLink="/estadisticas" routerLinkActive="activo">Estadísticas</a>
            <a routerLink="/guia" routerLinkActive="activo">Guía</a>
            @if (sesion.esAdmin()) {
              <a routerLink="/admin" routerLinkActive="activo">Administración</a>
            }
          } @else {
            <a routerLink="/guia" routerLinkActive="activo">Guía de gestos</a>
          }
        </nav>

        <div class="cuenta">
          @if (sesion.usuario(); as u) {
            <a class="cuenta__nombre" routerLink="/perfil" [title]="'Mi perfil (' + u.correo + ')'">{{ u.nombre }}</a>
            <button type="button" class="boton boton--fantasma boton--chico" (click)="salir()">Cerrar sesión</button>
          } @else {
            <a class="boton boton--fantasma boton--chico" routerLink="/entrar">Iniciar sesión</a>
            <a class="boton boton--chico" routerLink="/registro">Crear cuenta</a>
          }
        </div>
      </div>
      @if (simulado) {
        <p class="franja-simulada">
          Modo simulado: la cámara y el reconocedor son de prueba.
          <a href="?simulado=0">Usar la cámara real</a>
        </p>
      }
    </header>

    <main id="contenido" tabindex="-1">
      <router-outlet />
    </main>

    <div class="avisos" aria-live="polite">
      @for (a of avisos.lista(); track a.id) {
        <div class="aviso" [class]="'aviso aviso--' + a.tipo" role="status">
          <span>{{ a.texto }}</span>
          <button type="button" (click)="avisos.quitar(a.id)" aria-label="Cerrar aviso">×</button>
        </div>
      }
    </div>
  `,
  styleUrl: './app.scss',
})
export class App {
  protected readonly sesion = inject(SesionUsuario);
  protected readonly avisos = inject(Avisos);
  protected readonly simulado = inject(MODO_SIMULADO);
  private readonly router = inject(Router);

  protected salir(): void {
    this.sesion.cerrar();
    this.avisos.info('Cerraste sesión.');
    void this.router.navigate(['/']);
  }
}
