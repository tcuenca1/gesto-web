import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconoGesto } from '../../compartido/componentes/icono-gesto';
import { SesionUsuario } from '../../compartido/servicios/sesion-usuario';
import { GUIA_GESTOS } from '../../nucleo/dominio/gesto';

const ACCIONES_INICIALES: Record<string, string> = {
  Open_Palm: 'Reproducir o pausar el pase',
  Closed_Fist: 'Detener y volver al inicio',
  Pointing_Up: 'Siguiente imagen',
  Victory: 'Imagen anterior',
  Thumb_Up: 'Marcar como favorita',
  Thumb_Down: 'Quitar de favoritas',
  ILoveYou: 'Reacción de corazón',
};

/** Página de inicio para visitantes: ficha técnica del instrumento. */
@Component({
  selector: 'app-inicio',
  imports: [IconoGesto, RouterLink],
  template: `
    <section class="pagina ficha">
      <div class="ficha__texto">
        <span class="pagina__ruta">00 / GESTOWEB</span>
        <h1>Siete gestos de la mano, leídos por tu cámara.</h1>
        <p class="ficha__bajada">
          GestoWeb reconoce el gesto en tu navegador y lo convierte en una acción de la página:
          pasar de imagen, pausar, marcar favoritas.
        </p>

        <dl class="lecturas">
          <div><dt>Gestos</dt><dd>07</dd></div>
          <div><dt>Tiempo para aceptar</dt><dd>0,5 s</dd></div>
          <div><dt>Imágenes enviadas al servidor</dt><dd class="lecturas__cero">0</dd></div>
        </dl>

        <div class="ficha__botones">
          @if (sesion.autenticado()) {
            <a class="boton boton--senal boton--grande" routerLink="/reconocer">Reconocer gestos</a>
          } @else {
            <a class="boton boton--senal boton--grande" routerLink="/registro">Crear cuenta</a>
            <a class="boton boton--fantasma boton--grande" routerLink="/entrar">Entrar</a>
          }
        </div>
      </div>

      <figure class="visor" aria-hidden="true">
        <span class="visor__esquina visor__esquina--1"></span>
        <span class="visor__esquina visor__esquina--2"></span>
        <span class="visor__esquina visor__esquina--3"></span>
        <span class="visor__esquina visor__esquina--4"></span>
        <app-icono-gesto class="visor__mano" [codigo]="actual().codigo" [tamano]="220" [decorativo]="true" />
        <figcaption class="visor__lectura">
          <span>{{ codigoActual() }}</span>
          <span>{{ accionActual() }}</span>
        </figcaption>
      </figure>
    </section>

    <section class="pagina pasos">
      <h2 class="panel-titulo">Cómo se usa</h2>
      <ol class="pasos__lista">
        <li><span class="pasos__num">01</span><strong>Enciende la cámara.</strong> El navegador pide permiso una sola vez.</li>
        <li><span class="pasos__num">02</span><strong>Mantén el gesto 0,5 s.</strong> Un movimiento de paso no cuenta.</li>
        <li><span class="pasos__num">03</span><strong>La página ejecuta la acción</strong> y la guarda en tu historial.</li>
      </ol>

      <h2 class="panel-titulo">Gestos y acción inicial</h2>
      <table class="gestos">
        <tbody>
          @for (g of gestos; track g.codigo; let i = $index) {
            <tr>
              <td class="gestos__num">{{ i + 1 }}</td>
              <td class="gestos__icono"><app-icono-gesto [codigo]="g.codigo" [tamano]="36" [decorativo]="true" /></td>
              <td><strong>{{ g.nombre }}</strong></td>
              <td class="gestos__codigo">{{ g.codigo.toUpperCase() }}</td>
              <td>{{ acciones[g.codigo] }}</td>
            </tr>
          }
        </tbody>
      </table>
      <p class="texto-suave">Cada usuario puede cambiar qué hace cada gesto. <a routerLink="/guia">Cómo se hace cada uno</a>.</p>

      <p class="privacidad">
        <span class="etiqueta-dato">Privacidad</span>
        La imagen de la cámara se analiza en tu navegador. Al servidor solo llega el gesto,
        la confianza y la hora.
      </p>
    </section>
  `,
  styleUrl: './inicio.scss',
})
export class Inicio implements OnInit, OnDestroy {
  protected readonly sesion = inject(SesionUsuario);
  protected readonly gestos = GUIA_GESTOS;
  protected readonly acciones = ACCIONES_INICIALES;
  protected readonly indice = signal(0);
  protected readonly actual = computed(() => this.gestos[this.indice()]);
  protected readonly codigoActual = computed(() => this.actual().codigo.toUpperCase());
  protected readonly accionActual = computed(() => this.acciones[this.actual().codigo]);
  private temporizador: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    // El esqueleto recorre los 7 gestos cada 2,5 s, sin fundidos (salvo con "reducir movimiento").
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.temporizador = setInterval(() => this.indice.update((i) => (i + 1) % this.gestos.length), 2500);
    }
  }

  ngOnDestroy(): void {
    if (this.temporizador) clearInterval(this.temporizador);
  }
}
