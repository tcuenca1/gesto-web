/**
 * npm run modelo
 *
 * Descarga el modelo oficial de MediaPipe Gesture Recognizer (≈8 MB) a
 * public/assets/modelos/, para que la demo no dependa de internet (SRS §2.4).
 * Si no se descarga, la aplicación usa la copia oficial en línea.
 */
import { createWriteStream, existsSync, mkdirSync, statSync, renameSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const URL_MODELO =
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';
const destino = resolve(dirname(fileURLToPath(import.meta.url)), '../public/assets/modelos/gesture_recognizer.task');

if (existsSync(destino) && statSync(destino).size > 1_000_000 && !process.argv.includes('--forzar')) {
  console.log('✔ El modelo ya está descargado:', destino);
  process.exit(0);
}

mkdirSync(dirname(destino), { recursive: true });
console.log('Descargando el modelo de gestos de MediaPipe…');
const respuesta = await fetch(URL_MODELO);
if (!respuesta.ok || !respuesta.body) {
  console.error(`✖ No se pudo descargar (HTTP ${respuesta.status}). La app usará la copia en línea.`);
  process.exit(1);
}
const temporal = destino + '.parcial';
await pipeline(Readable.fromWeb(respuesta.body), createWriteStream(temporal));
renameSync(temporal, destino);
console.log(`✔ Modelo guardado en ${destino} (${(statSync(destino).size / 1e6).toFixed(1)} MB)`);
