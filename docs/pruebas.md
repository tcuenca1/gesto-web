# Pruebas de GestoWeb

Resumen de lo que se probó, cómo ejecutarlo y qué falta hacer con una cámara real.

## 1. Pruebas automáticas

| Dónde | Comando | Pruebas | Qué cubren |
|---|---|---|---|
| Backend | `npm test` | 51 | Dominio (reglas puras), **los 22 casos de uso** (RNF-14) con adaptadores en memoria y la API REST con Supertest |
| Backend | `npm run test:pg` | 15 | Triggers, procedimientos, función y vistas en PostgreSQL real; P-06, P-07 y P-09 |
| Frontend | `npm test` | 17 | Reglas de aceptación, ejecutor de acciones, cola de reintentos y motor de reconocimiento con adaptadores falsos |

Resultado de la última ejecución: **83 de 83 pruebas aprobadas**. Cobertura del núcleo del backend (dominio + aplicación): 89 % de instrucciones, 94 % de líneas.

`npm run test:pg` usa una base aparte, `gestoweb_pruebas`, y la reinicia en cada prueba: no toca tus datos. Se puede cambiar con `DATABASE_URL_PRUEBAS`.

## 2. Pruebas de aceptación (SRS §12.1)

| Prueba | Estado | Cómo se comprobó |
|---|---|---|
| **P-01 Precisión** | Pendiente: requiere personas y cámara | Procedimiento abajo. Depende del modelo de MediaPipe, no del código del equipo. |
| **P-02 Velocidad** | Pendiente: requiere cámara | En desarrollo (`npm start`) la pantalla Reconocer muestra "img/s" arriba a la derecha del video. Meta: 15 o más en 2 laptops. |
| **P-03 Respuesta** | Lógica comprobada; falta medir con cámara | Las pruebas del frontend confirman que la acción ocurre a los 500 ms de estabilidad. Con cámara, grabar la pantalla y medir: meta ≤ 1 s. |
| **P-04 Privacidad** | ✔ Aprobada | Prueba de extremo a extremo: se registraron todas las peticiones del navegador durante una sesión; 13 llevaban cuerpo y la mayor pesaba **103 bytes**. Ninguna contiene imágenes. Además el servidor rechaza cuerpos de más de 20 KB (prueba automática, HTTP 413). |
| **P-05 Permisos** | ✔ Aprobada | Automática (`http.prueba.ts`): ruta de administrador sin token → 401; con usuario normal → 403; token alterado → 401. En el navegador, un usuario normal que abre `/admin` vuelve a `/reconocer`. |
| **P-06 Contraseñas** | ✔ Aprobada | Automática (`base-datos.prueba.ts`): toda `contrasena_hash` es un hash bcrypt `$2b$10$…` y no contiene la contraseña. |
| **P-07 Base de datos** | ✔ Aprobada | Automática: al crear un usuario se crean 7 asignaciones; una detección en una sesión cerrada se rechaza con el error `GW001`. |
| **P-08 Usuario nuevo** | Pendiente: requiere una persona externa | La pantalla de registro lleva directo a Reconocer con el botón "Encender cámara" y la guía de gestos a la vista. |
| **P-09 Hexagonal** | ✔ Aprobada | Automática (`contrato.prueba.ts`): las mismas pruebas pasan con adaptadores PostgreSQL y en memoria sin tocar el núcleo. También `REPOSITORIOS=memoria` en el `.env`. |
| **P-10 Navegadores** | Parcial | El flujo completo (CU-03 en modo simulado) pasó en Chromium 153. Falta repetir con cámara real en Chrome, Edge y Firefox. |

### Otras comprobaciones hechas
- **RNF-04** (servidor < 0,5 s) con 100 000 detecciones cargadas (`npm run db:datos-prueba`):

  | Consulta | Tiempo |
  |---|---|
  | Historial, página 1 | 20 ms |
  | Historial filtrado por gesto y fechas | 8 ms |
  | Historial, página 200 | 19 ms |
  | Totales por gesto (`fn_estadisticas_usuario`) | 31 ms |
  | Uso por día, 30 días | 37 ms |
  | Uso general (`v_estadisticas_generales`) | 75 ms |

- **Extremo a extremo en modo simulado** (`frontend/e2e/recorrido.mjs`, Chromium sin ventana, 14 comprobaciones en verde; las instrucciones para ejecutarlo están al inicio del archivo): registro, cada gesto ejecuta su acción en el panel, mantener el índice ~3 s avanza 3 imágenes (pausa de 1 s), las detecciones llegan al historial, descarga CSV, estadísticas, cambio de configuración, administración de gestos y bitácora, vista de tableta (RNF-10) y mensaje claro cuando el modelo o la cámara fallan (RF-10). Las capturas de `docs/capturas/` salieron de esa ejecución.

## 3. Lo que no se pudo probar aquí (y por qué)

El entorno donde se construyó el proyecto no tiene cámara y no permite descargar el modelo desde los servidores de Google. Por eso **no se ejecutó MediaPipe con una mano real**: el adaptador `ReconocedorMediaPipe` está escrito según la API oficial de `@mediapipe/tasks-vision` 1.0.1 y compila, pero su primera prueba real debe hacerla el equipo (German es el responsable). Todo lo que está detrás del puerto `ReconocedorGestos` sí está probado.

Primera prueba sugerida con cámara (10 minutos):
1. `cd frontend && npm run modelo && npm start`, abrir http://localhost:4200/?simulado=0.
2. Encender la cámara: debe pedir permiso, mostrar el video espejado y dibujar los puntos de la mano.
3. Hacer ☝️: el anillo se llena y el panel avanza. Revisar que el contador "img/s" esté en 15 o más (P-02).
4. Con la mano derecha, el historial debe decir "Derecha" (si dice "Izquierda", invertir la línea de `mano` en `reconocedor-mediapipe.ts`).
5. Negar el permiso de cámara: debe aparecer el mensaje de cómo activarla (flujo 2a).

## 4. Procedimiento de P-01 (precisión)

1. Tres personas, buena luz de frente, fondo sencillo, a 40–70 cm de la cámara.
2. Cada persona hace cada gesto 10 veces, bajando la mano entre intentos.
3. Contar en el **Historial** (filtrando por gesto) cuántas veces se guardó el gesto correcto.
4. Se aprueba con **8 de 10 o más por gesto**. Si un gesto falla, probar bajando su confianza mínima en Administración → Gestos (por ejemplo, de 70 % a 60 %) y anotar el valor final en el informe.

Plantilla para el informe:

| Gesto | Persona 1 | Persona 2 | Persona 3 | ¿Aprueba? |
|---|---|---|---|---|
| Palma abierta | /10 | /10 | /10 | |
| Puño cerrado | /10 | /10 | /10 | |
| Índice arriba | /10 | /10 | /10 | |
| Victoria | /10 | /10 | /10 | |
| Pulgar arriba | /10 | /10 | /10 | |
| Pulgar abajo | /10 | /10 | /10 | |
| Te quiero | /10 | /10 | /10 | |
