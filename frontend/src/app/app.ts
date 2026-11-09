import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IconoGesto } from './compartido/componentes/icono-gesto';
import { MODO_SIMULADO } from './compartido/modo-simulado';
import { Avisos } from './compartido/servicios/avisos';
import { SesionUsuario } from './compartido/servicios/sesion-usuario';

const ETIQUETA_AVISO = { exito: 'OK', error: 'ERROR', info: 'AVISO' } as const;

/** Estructura común: barra superior, contenido de la página y registro de avisos. */
@Component({
  selector: 'app-root',
  imports: [IconoGesto, RouterOutlet, RouterLink, RouterLinkActive, DatePipe],
  template: `
    <a class="saltar" href="#contenido">Saltar al contenido</a>
    @if (simulado) {
      <p class="franja-simulada">
        <span>MODO SIMULADO · cámara y reconocedor de prueba</span>
        <a href="?simulado=0">Usar la cámara real</a>
      </p>
    }
    <header class="barra">
      <div class="barra__interior">
        <a class="marca" routerLink="/" aria-label="GestoWeb, inicio">
          <app-icono-gesto codigo="Open_Palm" [tamano]="30" [decorativo]="true" />
          <span>GestoWeb</span>
        </a>

        <nav class="menu" aria-label="Principal">
          @if (sesion.autenticado()) {
            <a routerLink="/reconocer" routerLinkActive="activo"><span class="menu__num">01</span>Reconocer</a>
            <a routerLink="/configuracion" routerLinkActive="activo"><span class="menu__num">02</span>Mis gestos</a>
            <a routerLink="/historial" routerLinkActive="activo"><span class="menu__num">03</span>Historial</a>
            <a routerLink="/estadisticas" routerLinkActive="activo"><span class="menu__num">04</span>Estadísticas</a>
            <a routerLink="/guia" routerLinkActive="activo"><span class="menu__num">05</span>Guía</a>
            @if (sesion.esAdmin()) {
              <a routerLink="/admin" routerLinkActive="activo"><span class="menu__num">06</span>Administración</a>
            }
          } @else {
            <a routerLink="/guia" routerLinkActive="activo">Guía de gestos</a>
          }
        </nav>

        <div class="cuenta">
          @if (sesion.usuario(); as u) {
            <a class="cuenta__nombre" routerLink="/perfil" [title]="'Mi perfil (' + u.correo + ')'">{{ u.nombre }}</a>
            <button type="button" class="boton boton--fantasma boton--chico" (click)="salir()">Salir</button>
          } @else {
            <a class="boton boton--fantasma boton--chico" routerLink="/entrar">Entrar</a>
            <a class="boton boton--chico" routerLink="/registro">Crear cuenta</a>
          }
        </div>
      </div>
    </header>

    <main id="contenido" tabindex="-1">
      <router-outlet />
    </main>

    <div class="avisos" aria-live="polite">
      @for (a of avisos.lista(); track a.id) {
        <div [class]="'aviso aviso--' + a.tipo" role="status">
          <span class="aviso__hora">{{ a.hora | date: 'HH:mm:ss' }}</span>
          <span class="aviso__tipo">{{ etiqueta[a.tipo] }}</span>
          <span class="aviso__texto">{{ a.texto }}</span>
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
  protected readonly etiqueta = ETIQUETA_AVISO;
  private readonly router = inject(Router);

  protected salir(): void {
    this.sesion.cerrar();
    this.avisos.info('Cerraste sesión.');
    void this.router.navigate(['/']);
  }
}
