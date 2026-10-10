/** Pequeñas funciones de formato usadas en varias pantallas. */

const formatoFechaHora = new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'medium' });
const formatoDia = new Intl.DateTimeFormat('es-EC', { weekday: 'short', day: 'numeric', month: 'short' });

export function fechaHora(iso: string | Date | null | undefined): string {
  return iso ? formatoFechaHora.format(new Date(iso)) : '—';
}

/** "2026-10-09" → "jue, 9 oct" (sin correrse de día por la zona horaria). */
export function diaCorto(dia: string): string {
  const [a, m, d] = dia.split('-').map(Number);
  return formatoDia.format(new Date(a, m - 1, d));
}

export function porcentaje(valor: number): string {
  return `${Math.round(valor * 100)} %`;
}

/** Inicio del día local hace N días, en ISO (para filtros de fechas). */
export function haceDias(dias: number): string {
  const f = new Date();
  f.setHours(0, 0, 0, 0);
  f.setDate(f.getDate() - dias);
  return f.toISOString();
}

/** Convierte "2026-10-09" de un <input type="date"> al inicio de ese día local en ISO. */
export function inicioDelDia(fecha: string): string | undefined {
  if (!fecha) return undefined;
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(a, m - 1, d).toISOString();
}

/** Igual, pero el inicio del día SIGUIENTE (para que "hasta" incluya todo el día). */
export function finDelDia(fecha: string): string | undefined {
  if (!fecha) return undefined;
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(a, m - 1, d + 1).toISOString();
}

export function descargarArchivo(nombre: string, contenido: Blob): void {
  const url = URL.createObjectURL(contenido);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
