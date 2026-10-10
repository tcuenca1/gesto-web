/** Configuración de desarrollo (ng serve). El proxy envía /api a http://localhost:3000. */
export const environment = {
  produccion: false,
  apiUrl: '/api',
  mostrarFps: true,
  modeloLocal: 'assets/modelos/gesture_recognizer.task',
  modeloRemoto:
    'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
  wasm: 'assets/mediapipe/wasm',
};
