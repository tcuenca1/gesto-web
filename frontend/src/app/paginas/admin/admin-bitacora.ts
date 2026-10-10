import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Avisos } from '../../compartido/servicios/avisos';
import { fechaHora } from '../../compartido/utilidades';
import { EntradaBitacora } from '../../nucleo/dominio/modelos';
import { ApiAdministracion, ApiGestoWeb } from '../../nucleo/puertos/api-gestoweb';

const OPERACIONES: Record<string, string> = { INSERT: 'Creó', UPDATE: 'Cambió', DELETE: 'Desactivó' };

/** RF-22 · Bitácora de cambios del administrador, con los valores antes y después. */
@Component({
  selector: 'app-admin-bitacora',
  template: `
    <div class="panel tabla-contenedor">
      @if (entradas().length === 0) {
        <p class="vacio">Todavía no hay cambios registrados.</p>
      } @else {
        <table>
          <thead><tr><th>Fecha</th><th>Administrador</th><th>Qué hizo</th><th>Cambios</th></tr></thead>
          <tbody>
            @for (e of entradas(); track e.id) {
              <tr>
                <td>{{ fecha(e.fechaHora) }}</td>
                <td>{{ e.nombreUsuario }}</td>
                <td>{{ operacion(e.operacion) }} en <strong>{{ e.tablaAfectada }}</strong></td>
                <td>
                  <ul class="cambios">
                    @for (c of diferencias(e); track c.campo) {
                      <li>{{ c.campo }}: @if (c.antes !== undefined) { <del>{{ c.antes }}</del> } <ins>{{ c.despues }}</ins></li>
                    }
                  </ul>
                </td>
              </tr>
            }
          </tbody>
        </table>
        <div class="acciones-fila paginacion">
          <button class="boton boton--chico boton--fantasma" type="button" (click)="cargar(pagina() - 1)" [disabled]="pagina() <= 1">Más recientes</button>
          <button class="boton boton--chico boton--fantasma" type="button" (click)="cargar(pagina() + 1)" [disabled]="pagina() >= paginas()">Más antiguos</button>
        </div>
      }
    </div>
  `,
  styleUrl: './admin.scss',
  styles: `.paginacion { margin-top: 1rem; } td:first-child { white-space: nowrap; }`,
})
export class AdminBitacora implements OnInit {
  private readonly api: ApiAdministracion = inject(ApiGestoWeb);
  private readonly avisos = inject(Avisos);
  protected readonly entradas = signal<EntradaBitacora[]>([]);
  protected readonly pagina = signal(1);
  private readonly total = signal(0);
  protected readonly paginas = computed(() => Math.max(1, Math.ceil(this.total() / 20)));
  protected readonly fecha = fechaHora;

  ngOnInit(): void {
    void this.cargar(1);
  }

  protected operacion(op: string): string {
    return OPERACIONES[op] ?? op;
  }

  /** Solo los campos que cambiaron. */
  protected diferencias(e: EntradaBitacora): Array<{ campo: string; antes?: string; despues: string }> {
    const antes = e.detalle?.antes ?? {};
    const despues = e.detalle?.despues ?? {};
    return Object.keys(despues)
      .filter((k) => k !== 'id' && JSON.stringify(antes[k]) !== JSON.stringify(despues[k]))
      .map((k) => ({ campo: k, antes: k in antes ? texto(antes[k]) : undefined, despues: texto(despues[k]) }));
  }

  protected async cargar(pagina: number): Promise<void> {
    try {
      const r = await this.api.bitacora(pagina, 20);
      this.entradas.set(r.elementos);
      this.total.set(r.total);
      this.pagina.set(r.pagina);
    } catch (e) {
      this.avisos.error(e);
    }
  }
}

function texto(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '(vacío)';
  if (typeof valor === 'boolean') return valor ? 'sí' : 'no';
  return String(valor);
}
