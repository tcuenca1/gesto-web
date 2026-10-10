import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Avisos } from '../../compartido/servicios/avisos';
import { SesionUsuario } from '../../compartido/servicios/sesion-usuario';
import { ApiAutenticacion, ApiGestoWeb } from '../../nucleo/puertos/api-gestoweb';

/** RF-01 · Crear una cuenta. Al terminar, la sesión queda iniciada. */
@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="auth">
      <h1>Crear cuenta</h1>
      <form class="panel" [formGroup]="formulario" (ngSubmit)="enviar()" novalidate>
        @if (error()) {
          <p class="alerta alerta--error" role="alert">{{ error() }}</p>
        }
        <div class="campo">
          <label for="nombre">Nombre</label>
          <input id="nombre" formControlName="nombre" autocomplete="name" maxlength="80" required />
        </div>
        <div class="campo">
          <label for="correo">Correo</label>
          <input id="correo" type="email" formControlName="correo" autocomplete="email" maxlength="120" required />
        </div>
        <div class="campo">
          <label for="contrasena">Contraseña</label>
          <input id="contrasena" type="password" formControlName="contrasena" autocomplete="new-password" maxlength="72" required aria-describedby="ayuda-contrasena" />
          <small id="ayuda-contrasena">Al menos 8 caracteres, con letras y números.</small>
        </div>
        <button class="boton boton--grande" type="submit" [disabled]="enviando()">
          {{ enviando() ? 'Creando cuenta…' : 'Crear cuenta' }}
        </button>
      </form>
      <p class="auth__pie">¿Ya tienes cuenta? <a routerLink="/entrar">Iniciar sesión</a></p>
    </section>
  `,
  styleUrl: './auth.scss',
})
export class Registro {
  private readonly api: ApiAutenticacion = inject(ApiGestoWeb);
  private readonly sesion = inject(SesionUsuario);
  private readonly router = inject(Router);
  private readonly avisos = inject(Avisos);

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly formulario = inject(FormBuilder).nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(80)]],
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Za-zÁÉÍÓÚáéíóúÑñ])(?=.*\d).+$/)]],
  });

  protected async enviar(): Promise<void> {
    const c = this.formulario.controls;
    if (this.formulario.invalid) {
      this.error.set(
        c.nombre.invalid ? 'Escribe tu nombre.'
        : c.correo.invalid ? 'Escribe un correo válido.'
        : 'La contraseña necesita al menos 8 caracteres, con letras y números.',
      );
      return;
    }
    this.enviando.set(true);
    this.error.set(null);
    try {
      const datos = this.formulario.getRawValue();
      await this.api.registrarse(datos);
      this.sesion.iniciar(await this.api.iniciarSesion(datos.correo, datos.contrasena));
      this.avisos.exito('Cuenta creada. Enciende la cámara para probar tu primer gesto.');
      await this.router.navigate(['/reconocer']);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.enviando.set(false);
    }
  }
}
