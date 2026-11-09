import { Injectable, signal } from '@angular/core';

export interface Aviso {
  id: number;
  tipo: 'exito' | 'error' | 'info';
  texto: string;
  hora: Date;
}

/** Registro de avisos: líneas cortas con hora que aparecen abajo a la izquierda y se van solas. */
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

  private mostrar(tipo: Aviso['tipo'], texto: string, duracion = 5000): void {
    const id = this.siguienteId++;
    this.lista.update((l) => [...l.slice(-2), { id, tipo, texto, hora: new Date() }]);
    setTimeout(() => this.quitar(id), duracion);
  }
}
