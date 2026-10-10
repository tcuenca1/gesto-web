import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Avisos } from '../../compartido/servicios/avisos';
import { SesionUsuario } from '../../compartido/servicios/sesion-usuario';
import { ApiAutenticacion, ApiGestoWeb } from '../../nucleo/puertos/api-gestoweb';

/** RF-02 · Iniciar sesión. */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="auth">
      <h1>Iniciar sesión</h1>
      @if (vencida()) {
        <p class="alerta alerta--info">Tu sesión venció. Vuelve a iniciar sesión para continuar.</p>
      }
      <form class="panel" [formGroup]="formulario" (ngSubmit)="enviar()" novalidate>
        @if (error()) {
          <p class="alerta alerta--error" role="alert">{{ error() }}</p>
        }
        <div class="campo">
          <label for="correo">Correo</label>
          <input id="correo" type="email" formControlName="correo" autocomplete="email" required />
        </div>
        <div class="campo">
          <label for="contrasena">Contraseña</label>
          <input id="contrasena" type="password" formControlName="contrasena" autocomplete="current-password" required />
        </div>
        <button class="boton boton--grande" type="submit" [disabled]="enviando()">
          {{ enviando() ? 'Entrando…' : 'Iniciar sesión' }}
        </button>
      </form>
      <p class="auth__pie">¿No tienes cuenta? <a routerLink="/registro">Crear una cuenta</a></p>
      @if (!produccion) {
        <p class="auth__prueba">Administrador de prueba: <code>admin&#64;gestoweb.local</code> / <code>Admin123!</code></p>
      }
    </section>
  `,
  styleUrl: './auth.scss',
})
export class Login {
  /** ?volver=/historial → a dónde ir después de entrar. */
  readonly volver = input<string>();
  /** ?vencida=1 → la sesión anterior venció. */
  readonly vencida = input<string>();

  private readonly api: ApiAutenticacion = inject(ApiGestoWeb);
  private readonly sesion = inject(SesionUsuario);
  private readonly router = inject(Router);
  private readonly avisos = inject(Avisos);

  protected readonly produccion = environment.produccion;
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly formulario = inject(FormBuilder).nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', Validators.required],
  });

  protected async enviar(): Promise<void> {
    if (this.formulario.invalid) {
      this.error.set('Escribe tu correo y tu contraseña.');
      return;
    }
    this.enviando.set(true);
    this.error.set(null);
    try {
      const { correo, contrasena } = this.formulario.getRawValue();
      const resultado = await this.api.iniciarSesion(correo, contrasena);
      this.sesion.iniciar(resultado);
      this.avisos.exito(`Hola, ${resultado.usuario.nombre.split(' ')[0]}.`);
      const destino = this.volver()?.startsWith('/') ? this.volver()! : '/reconocer';
      await this.router.navigateByUrl(destino);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.enviando.set(false);
    }
  }
}
