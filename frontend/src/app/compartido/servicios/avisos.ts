import { Injectable, signal } from '@angular/core';

export interface Aviso {
  id: number;
  tipo: 'exito' | 'error' | 'info';
  texto: string;
}

/** Mensajes cortos que aparecen abajo de la pantalla y se van solos. */
@Injectable({ providedIn: 'root' })
export class Avisos {
  readonly lista = signal<Aviso[]>([]);
  private siguienteId = 1;

  exito(texto: string): void {
    this.mostrar('exito', texto);
  }

  error(error: unknown): void {
    const texto = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Ocurrió un error inesperado.';
    this.mostrar('error', texto, 6000);
  }

  info(texto: string): void {
    this.mostrar('info', texto);
  }

  quitar(id: number): void {
    this.lista.update((l) => l.filter((a) => a.id !== id));
  }

  private mostrar(tipo: Aviso['tipo'], texto: string, duracion = 3500): void {
    const id = this.siguienteId++;
    this.lista.update((l) => [...l.slice(-2), { id, tipo, texto }]);
    setTimeout(() => this.quitar(id), duracion);
  }
}
