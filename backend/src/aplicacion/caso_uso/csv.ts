/**
 * Generador de CSV (RFC 4180) sin dependencias.
 * Empieza con BOM UTF-8 para que Excel muestre bien las tildes y la ñ.
 */
export function generarCsv(encabezados: string[], filas: Array<Array<string | number | null>>): string {
  const lineas = [encabezados, ...filas].map((fila) => fila.map(escaparCelda).join(','));
  return '﻿' + lineas.join('\r\n') + '\r\n';
}

function escaparCelda(valor: string | number | null): string {
  if (valor === null) return '';
  let texto = String(valor);
  // Evita que Excel interprete una celda como fórmula (inyección CSV).
  if (/^[=+\-@\t\r]/.test(texto) && typeof valor === 'string') texto = `'${texto}`;
  return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** Fecha y hora local legible, por ejemplo 2026-10-09 14:05:33. */
export function formatearFechaLocal(fecha: Date, zonaHoraria: string): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: zonaHoraria,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(fecha);
  const v = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '';
  return `${v('year')}-${v('month')}-${v('day')} ${v('hour')}:${v('minute')}:${v('second')}`;
}
