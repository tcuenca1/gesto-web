/**
 * Configuración de producción.
 *
 * apiUrl = '/api' significa "el mismo dominio que el frontend". Funciona si:
 *  - el backend sirve el frontend (CARPETA_FRONTEND), o
 *  - Vercel/Netlify redirigen /api al backend (ver vercel.json / netlify.toml).
 * Si publicas el backend en otro dominio sin redirección, pon aquí su URL
 * completa, por ejemplo 'https://gestoweb-api.up.railway.app/api'.
 */
export const environment = {
  produccion: true,
  apiUrl: '/api',
  /** Muestra el contador de imágenes por segundo (prueba P-02). */
  mostrarFps: false,
  /** Ruta local del modelo; si no está, se usa la copia oficial de Google. */
  modeloLocal: 'assets/modelos/gesture_recognizer.task',
  modeloRemoto:
    'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
  wasm: 'assets/mediapipe/wasm',
};
