import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Avisos } from '../../compartido/servicios/avisos';
import { SesionUsuario } from '../../compartido/servicios/sesion-usuario';
import { fechaHora } from '../../compartido/utilidades';
import { ApiAutenticacion, ApiGestoWeb } from '../../nucleo/puertos/api-gestoweb';

/** RF-05 · Editar el nombre y cambiar la contraseña. */
@Component({
  selector: 'app-perfil',
  imports: [ReactiveFormsModule],
  template: `
    <section class="pagina">
      <div class="pagina__titulo">
        <div>
          <h1>Mi perfil</h1>
          @if (sesion.usuario(); as u) {
            <p>{{ u.correo }}. Cuenta de {{ u.rol === 'ADMIN' ? 'administrador' : 'usuario' }} creada el {{ fecha(u.fechaRegistro) }}.</p>
          }
        </div>
      </div>

      <div class="columnas">
        <form class="panel" [formGroup]="nombre" (ngSubmit)="guardarNombre()">
          <h2>Nombre</h2>
          <div class="campo">
            <label for="nombre">Cómo quieres que te llamemos</label>
            <input id="nombre" formControlName="nombre" maxlength="80" />
          </div>
          <button class="boton" type="submit" [disabled]="nombre.invalid || guardando()">Guardar nombre</button>
        </form>

        <form class="panel" [formGroup]="claves" (ngSubmit)="cambiarContrasena()">
          <h2>Contraseña</h2>
          @if (errorClave()) {
            <p class="alerta alerta--error" role="alert">{{ errorClave() }}</p>
          }
          <div class="campo">
            <label for="actual">Contraseña actual</label>
            <input id="actual" type="password" formControlName="actual" autocomplete="current-password" />
          </div>
          <div class="campo">
            <label for="nueva">Contraseña nueva</label>
            <input id="nueva" type="password" formControlName="nueva" autocomplete="new-password" maxlength="72" />
            <small>Al menos 8 caracteres, con letras y números.</small>
          </div>
          <button class="boton" type="submit" [disabled]="claves.invalid || guardando()">Cambiar contraseña</button>
        </form>
      </div>
    </section>
  `,
  styles: `
    .columnas { display: grid; grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr)); gap: 1.25rem; align-items: start; }
    h2 { font-size: 1.25rem; }
  `,
})
export class Perfil {
  protected readonly sesion = inject(SesionUsuario);
  private readonly api: ApiAutenticacion = inject(ApiGestoWeb);
  private readonly avisos = inject(Avisos);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly fecha = fechaHora;
  protected readonly guardando = signal(false);
  protected readonly errorClave = signal<string | null>(null);
  protected readonly nombre = this.fb.group({ nombre: [this.sesion.usuario()?.nombre ?? '', [Validators.required, Validators.maxLength(80)]] });
  protected readonly claves = this.fb.group({
    actual: ['', Validators.required],
    nueva: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected async guardarNombre(): Promise<void> {
    this.guardando.set(true);
    try {
      this.sesion.actualizarUsuario(await this.api.editarPerfil({ nombre: this.nombre.getRawValue().nombre }));
      this.avisos.exito('Nombre guardado.');
    } catch (e) {
      this.avisos.error(e);
    } finally {
      this.guardando.set(false);
    }
  }

  protected async cambiarContrasena(): Promise<void> {
    this.guardando.set(true);
    this.errorClave.set(null);
    try {
      const { actual, nueva } = this.claves.getRawValue();
      await this.api.editarPerfil({ contrasenaActual: actual, contrasenaNueva: nueva });
      this.claves.reset();
      this.avisos.exito('Contraseña cambiada.');
    } catch (e) {
      this.errorClave.set((e as Error).message);
    } finally {
      this.guardando.set(false);
    }
  }
}
