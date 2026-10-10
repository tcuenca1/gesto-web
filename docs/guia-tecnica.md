# Guía técnica de GestoWeb

Documento para el equipo: cómo está construido el sistema, cómo se ejecuta, cómo se publica y cómo se extiende. La explicación de la arquitectura hexagonal y SOLID está aparte, en [arquitectura-hexagonal-y-solid.md](arquitectura-hexagonal-y-solid.md).

## Índice
1. [Visión general](#1-visión-general)
2. [Tecnologías](#2-tecnologías)
3. [Backend](#3-backend)
4. [Contrato de la API](#4-contrato-de-la-api)
5. [Base de datos](#5-base-de-datos)
6. [Frontend](#6-frontend)
7. [Configuración](#7-configuración)
8. [Publicación](#8-publicación)
9. [Decisiones y diferencias con la SRS](#9-decisiones-y-diferencias-con-la-srs)
10. [Cómo extender el sistema](#10-cómo-extender-el-sistema)
11. [Problemas comunes](#11-problemas-comunes)

---

## 1. Visión general

**En simple:** el navegador mira la cámara, reconoce el gesto y hace la acción. Después le avisa al servidor "pasó tal gesto", y el servidor lo guarda en PostgreSQL para el historial y las estadísticas.

```
 NAVEGADOR (Angular)                                         SERVIDOR (Node + Express)          POSTGRESQL
 ┌─────────────────────────────────────────────────────┐    ┌────────────────────────────┐    ┌───────────┐
 │ Cámara ──► MediaPipe ──► Reglas de ──► Ejecutor de   │    │ API REST ──► Casos de uso  │    │ 8 tablas  │
 │ (adaptador) (adaptador)   aceptación   acciones      │    │ (adaptador)  ──► Dominio   │──► │ triggers  │
 │                           (núcleo)     (panel demo)  │    │                 │          │    │ vistas    │
 │                               │                      │    │      repositorios PG ◄─────┘    │           │
 │                               └─► Cola de envío ─────┼───►│  POST /sesiones/:id/detecciones │           │
 └─────────────────────────────────────────────────────┘    └────────────────────────────┘    └───────────┘
          la imagen se queda aquí                         solo viaja: gesto, confianza, mano y hora
```

## 2. Tecnologías

| Parte | Herramienta | Versión |
|---|---|---|
| Frontend | Angular (componentes standalone, signals, control flow `@if/@for`) | 20.3 |
| Reconocimiento | `@mediapipe/tasks-vision` (Gesture Recognizer) | **1.0.1 fijada** (riesgo "cambia la versión de MediaPipe", SRS §13.1) |
| Gráficos | Chart.js | 4.5 |
| Backend | Node.js + Express + TypeScript | Node ≥ 20, Express 4 |
| Base de datos | PostgreSQL + librería `pg` | probado en 16 |
| Seguridad | `bcryptjs` (bcrypt) y `jsonwebtoken` (JWT HS256) | — |
| Pruebas | Jest + Supertest (backend), Jasmine + Karma (frontend) | — |
| Tipografías | Bricolage Grotesque y Atkinson Hyperlegible, empaquetadas con `@fontsource` (funcionan sin internet) | — |

## 3. Backend

### 3.1 Carpetas

```
backend/src/
├── dominio/                    ← no importa NINGUNA librería
│   ├── compartido/errores.ts   ErrorValidacion, ErrorConflicto…
│   ├── usuario/Usuario.ts
│   ├── gesto/Gesto.ts
│   ├── accion/Accion.ts, Asignacion.ts (regla resolverAccionEfectiva)
│   └── deteccion/SesionReconocimiento.ts, Deteccion.ts, Estadisticas.ts
├── aplicacion/
│   ├── puertos/entrada/        contratos de los casos de uso (CasoDeUso<Entrada, Salida>)
│   ├── puertos/salida/         UsuarioRepositorio, DeteccionRepositorio, CifradorContrasenas, GeneradorTokens, Reloj, UnidadDeTrabajo…
│   └── casos-uso/              una clase por caso de uso (SRS §7.2) + index.ts que los arma
├── infraestructura/
│   ├── http/                   app.ts, rutas, middlewares (token, rol, errores)
│   ├── persistencia/postgres/  adaptadores PostgreSQL
│   ├── persistencia/memoria/   adaptadores en memoria (pruebas y P-09)
│   ├── seguridad/              CifradorBcrypt, GeneradorTokensJwt
│   └── sistema/RelojSistema.ts
├── config/entorno.ts           lee .env
└── main.ts                     raíz de composición: elige un adaptador para cada puerto
```

### 3.2 Recorrido de una petición

Ejemplo: el navegador envía `POST /api/sesiones/12/detecciones` con `{ "codigoGesto": "Thumb_Up", "confianza": 0.91, "mano": "Derecha" }`.

1. **Middleware de token** (`infraestructura/http/middlewares`) lee `Authorization: Bearer …` y llama al caso de uso `AutenticarSolicitud`, que valida el JWT y vuelve a leer al usuario (si un admin lo desactivó, se rechaza al instante).
2. **Controlador** (`rutasUsuario.ts`) solo traduce la petición a una entrada del caso de uso y llama `casos.reconocimiento.registrarDeteccion.ejecutar(...)`.
3. **Caso de uso `RegistrarDeteccion`** busca la sesión y el gesto por los puertos, calcula la acción del usuario con `resolverAccionEfectiva` y pide a `ReglasDeteccion.crear` que valide: sesión propia y abierta, gesto activo, confianza ≥ umbral, mano válida, hora razonable.
4. **Adaptador `DeteccionRepositorioPg`** hace el `INSERT`. En la base, `trg_validar_sesion_abierta` vuelve a comprobar la sesión y `trg_contar_detecciones` suma 1 al total.
5. Si algo falla en cualquier capa se lanza un `ErrorDominio`; el **manejador de errores** lo convierte a HTTP:

| Tipo de error | HTTP | Ejemplo |
|---|---|---|
| `VALIDACION` | 400 | Confianza bajo el umbral, correo mal escrito |
| `NO_AUTENTICADO` | 401 | Sin token, token vencido, contraseña incorrecta |
| `PROHIBIDO` | 403 | Usuario normal en `/api/admin/*` |
| `NO_ENCONTRADO` | 404 | Sesión de otro usuario o inexistente |
| `CONFLICTO` | 409 | Correo repetido, sesión cerrada (`codigo: SESION_CERRADA`) |
| — | 413 | Cuerpo mayor a 20 KB (una imagen nunca cabe: RNF-01) |
| — | 429 | Más de 30 intentos de login/registro en 15 min por IP |

Formato de todos los errores: `{ "error": { "codigo": "VALIDACION", "mensaje": "La confianza 0.5 no alcanza el mínimo de 0.7 para Pulgar arriba" } }`.

### 3.3 Seguridad (RNF-06, RNF-07)
- Contraseñas con **bcrypt** (costo 10): 8–72 caracteres, con letras y números.
- **JWT HS256** que vence a las **8 horas**; el rol se vuelve a leer de la base en cada petición.
- El login responde igual si el correo no existe o la contraseña está mal (y tarda lo mismo: compara contra un hash de relleno), así no se puede averiguar qué correos están registrados.
- Límite de intentos en `/api/auth`, cabeceras `X-Content-Type-Options`, `X-Frame-Options`, `Permissions-Policy: camera=(self)`.
- La bitácora se escribe **en la misma transacción** que el cambio del administrador (puerto `UnidadDeTrabajo`): o se guardan los dos o ninguno.

## 4. Contrato de la API

Base: `/api`. Todas las rutas, salvo `auth` y `salud`, exigen `Authorization: Bearer <token>`. Hay una colección lista en [GestoWeb.postman_collection.json](GestoWeb.postman_collection.json).

| Método | Ruta | Rol | Cuerpo / parámetros | Respuesta |
|---|---|---|---|---|
| GET | `/salud` | Visitante | — | `{ estado: "ok" }` |
| POST | `/auth/registro` | Visitante | `{ nombre, correo, contrasena }` | 201 · usuario |
| POST | `/auth/login` | Visitante | `{ correo, contrasena }` | `{ token, expiraEn, usuario }` |
| GET | `/usuarios/yo` | Usuario | — | usuario |
| PUT | `/usuarios/yo` | Usuario | `{ nombre?, contrasenaActual?, contrasenaNueva? }` | usuario |
| GET | `/gestos` | Usuario | — | gestos activos |
| GET | `/acciones` | Usuario | — | acciones activas |
| GET | `/asignaciones` | Usuario | — | `[{ gesto, accion, esPredeterminada }]` |
| PUT | `/asignaciones/:idGesto` | Usuario | `{ idAccion }` | asignación |
| POST | `/asignaciones/restaurar` | Usuario | — | asignaciones |
| POST | `/sesiones` | Usuario | `{ navegador? }` | 201 · sesión |
| PATCH | `/sesiones/:id/cerrar` | Usuario | — | sesión con `totalDetecciones` |
| POST | `/sesiones/:id/detecciones` | Usuario | `{ codigoGesto, confianza, mano, fechaHora? }` | 201 · detección con la acción |
| GET | `/historial` | Usuario | `?desde&hasta&gesto&pagina&limite` (fechas ISO, límite máx. 100) | `{ elementos, total, pagina, limite }` |
| GET | `/historial/csv` | Usuario | mismos filtros + `?zona` | archivo CSV (UTF-8 con BOM, máx. 10 000 filas) |
| GET | `/estadisticas` | Usuario | `?desde&hasta&zona` | `{ totalDetecciones, gestoMasUsado, confianzaPromedio, totalesPorGesto, usoPorDia }` |
| GET | `/admin/gestos` | Admin | — | todos los gestos (incluye inactivos) |
| PUT | `/admin/gestos/:id` | Admin | `{ nombre?, descripcion?, umbralConfianza?, activo? }` | gesto |
| GET | `/admin/acciones` | Admin | — | todas las acciones |
| POST | `/admin/acciones` | Admin | `{ codigo, nombre, descripcion? }` | 201 · acción |
| PUT | `/admin/acciones/:id` | Admin | `{ nombre?, descripcion?, activa? }` | acción |
| DELETE | `/admin/acciones/:id` | Admin | — | acción desactivada (borrado lógico) |
| GET | `/admin/usuarios` | Admin | — | usuarios |
| PATCH | `/admin/usuarios/:id` | Admin | `{ rol?, activo? }` | usuario |
| GET | `/admin/estadisticas` | Admin | `?desde&hasta&zona` | totales, uso por gesto y por día |
| GET | `/admin/bitacora` | Admin | `?pagina&limite` | `{ elementos, total, … }` |

`zona` es una zona horaria IANA (por defecto `America/Guayaquil`); sirve para agrupar "uso por día" según el día del usuario y no el de UTC.

## 5. Base de datos

Scripts en `base-datos/`, en orden. `npm run db:crear` los ejecuta todos (no necesita `psql`).

| Script | Contenido |
|---|---|
| `01_tablas.sql` | 8 tablas con llaves, `CHECK` (confianza 0–1, mano, correo en minúsculas, fechas coherentes) e índices de la SRS §9.4 + uno parcial para sesiones abiertas |
| `02_funciones_triggers.sql` | `trg_asignaciones_iniciales`, `trg_contar_detecciones`, `trg_validar_sesion_abierta` (error propio **GW001**), `sp_abrir_sesion`, `sp_restaurar_asignaciones`, `fn_estadisticas_usuario` |
| `03_vistas.sql` | `v_historial`, `v_estadisticas_generales` |
| `04_datos_iniciales.sql` | 2 roles, 8 acciones, 7 gestos y el administrador de prueba |

Detalles a tener en cuenta:
- **Todas las fechas se guardan en UTC** (`TIMESTAMP` con `NOW() AT TIME ZONE 'UTC'`). La conexión del backend usa `timezone=UTC` y convierte las fechas de JavaScript a UTC al escribirlas. Así no importa la zona del servidor de Railway ni la de cada laptop.
- `sp_abrir_sesion` cierra la sesión que quedó abierta (pestaña cerrada sin apagar la cámara, flujo 9a) con la **hora de su última detección**, no con la hora actual, para que la duración de la sesión sea real.
- "Eliminar" una acción es **desactivarla**: las detecciones antiguas siguen apuntando a ella y el historial no pierde datos. No se puede desactivar una acción que es la predeterminada de un gesto, ni `NINGUNA`.

## 6. Frontend

### 6.1 Carpetas

```
frontend/src/app/
├── nucleo/
│   ├── dominio/      gesto.ts (códigos, puntos de la mano, guía) · modelos.ts (datos de la API, ErrorApi)
│   ├── puertos/      ReconocedorGestos · Camara · ApiGestoWeb (dividido en 5 interfaces)
│   └── servicios/    reglas-aceptacion.ts · ejecutor-acciones.ts · cola-detecciones.ts · motor-reconocimiento.ts
├── adaptadores/
│   ├── mediapipe/    ReconocedorMediaPipe (único archivo que importa MediaPipe)
│   ├── camara/       CamaraNavegador (getUserMedia y mensajes de error)
│   ├── http/         ApiGestoWebHttp + interceptor del token
│   └── simulado/     CamaraSimulada + ReconocedorSimulado (?simulado=1)
├── paginas/          inicio, auth, reconocer (+ panel de demostración), guia, configuracion, historial, estadisticas, perfil, admin/*
├── compartido/       guards, SesionUsuario, Avisos, Grafico (Chart.js), utilidades
└── app.config.ts     raíz de composición: puerto → adaptador
```

### 6.2 El ciclo de reconocimiento (CU-03)

`MotorReconocimiento` coordina todo y vive solo mientras la pantalla Reconocer está abierta:

1. **Encender:** en paralelo carga las asignaciones del usuario y el modelo; luego enciende la cámara.
2. **Bucle** con `requestAnimationFrame`, fuera de la zona de Angular para no redibujar de más. Solo analiza cuando el video trae una imagen nueva.
3. Cada resultado pasa por **`ReglasAceptacion`** (TypeScript puro):
   - confianza ≥ umbral **de ese gesto** (lo define el administrador);
   - el mismo gesto **500 ms** seguidos (estabilidad);
   - **1 s** de pausa antes de repetir el mismo gesto;
   - tolera parpadeos de hasta 150 ms (un cuadro borroso no reinicia la cuenta);
   - `None` y los gestos desactivados se ignoran.
4. Gesto aceptado → **`EjecutorAcciones`** ejecuta el manejador registrado para su código (el panel registró los suyos al iniciar) → la detección entra a la **`ColaDetecciones`**.
5. La cola envía en orden. Si el servidor no responde, reintenta cada 3 s sin detener el reconocimiento (flujo 8a); cada detección conserva la hora en que ocurrió. Si la sesión se cerró en el servidor (código `SESION_CERRADA`), abre otra y reintenta.
6. **Apagar:** intenta enviar lo pendiente (máx. 3 s) y cierra la sesión.

Otros detalles:
- El video y los puntos se muestran **espejados** (como un espejo). MediaPipe asume imágenes de selfie espejadas, por eso el adaptador **invierte izquierda/derecha** al informar la mano.
- La librería de MediaPipe se carga con `import()` dinámico: no pesa en la primera carga (≈94 KB transferidos).
- El modelo se busca primero en `assets/modelos/` y, si no está, se usa la copia oficial de Google. Los archivos WASM se copian de `node_modules` al compilar (`angular.json`).
- Si no hay WebGL2, el modelo pasa automáticamente de GPU a CPU.
- `?simulado=1` cambia la cámara y el modelo por adaptadores falsos sin tocar nada más. Sirve para desarrollar sin cámara y como **plan B de la demo**.

## 7. Configuración

`backend/.env` (copiar de `.env.example`):

| Variable | Por defecto | Para qué |
|---|---|---|
| `PUERTO` (o `PORT`) | 3000 | Puerto HTTP |
| `REPOSITORIOS` | `postgres` | `memoria` para usar el backend sin base de datos |
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/gestoweb` | Conexión a PostgreSQL |
| `PGSSL` | `false` | `true` en proveedores que exigen SSL |
| `JWT_SECRETO` | (solo en desarrollo) | Obligatorio en producción, ≥ 32 caracteres |
| `JWT_EXPIRACION` | `8h` | Duración del token |
| `CORS_ORIGENES` | `http://localhost:4200` | Orígenes permitidos, separados por coma |
| `ZONA_HORARIA` | `America/Guayaquil` | Zona por defecto para "uso por día" |
| `CARPETA_FRONTEND` | — | Si se indica, el backend también sirve el frontend compilado |
| `NODE_ENV` | — | `production` en la nube |

Frontend: `src/environments/environment.ts` (producción) y `environment.development.ts`. `apiUrl` es `/api` en ambos: en desarrollo lo resuelve `proxy.conf.json` y en producción la redirección de Vercel/Netlify o el mismo backend.

## 8. Publicación

Requisito: **https** (la cámara no funciona en http, salvo localhost).

**Backend y base de datos en Railway**
1. Crear un proyecto en Railway con un servicio **PostgreSQL** y otro desde el repositorio de GitHub con carpeta raíz `backend`.
2. Variables del servicio: `NODE_ENV=production`, `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `PGSSL=true` si lo pide, `JWT_SECRETO=<48 bytes aleatorios>`, `CORS_ORIGENES=https://tu-frontend.vercel.app`.
3. Comando de construcción `npm run build`, de inicio `npm start`.
4. Una vez, desde tu computador con la `DATABASE_URL` pública de Railway: `npm run db:crear`.

**Frontend en Vercel (o Netlify)**
1. Importar el repositorio con carpeta raíz `frontend`.
2. En `vercel.json` (o `netlify.toml`) reemplazar `CAMBIAR-POR-TU-BACKEND.up.railway.app` por el dominio real del backend. Así `/api` se reenvía al backend y no hace falta CORS.
3. Ejecutar `npm run modelo` antes de construir (o subir el archivo del modelo) para no depender de Google en la demo.

**Opción de un solo servidor:** compilar el frontend y publicar solo el backend con `CARPETA_FRONTEND` apuntando a `frontend/dist/gestoweb/browser`.

> Revisen los límites vigentes de los planes gratuitos de Railway, Vercel y Netlify antes de la presentación: cambian con frecuencia.

## 9. Decisiones y diferencias con la SRS

| Tema | Decisión | Motivo |
|---|---|---|
| Librería bcrypt | `bcryptjs` en vez de `bcrypt` | Mismo algoritmo y hashes compatibles, pero no necesita compilar C++ (en Windows `bcrypt` suele fallar al instalar). Cambiarla solo toca `CifradorBcrypt.ts`. |
| Rutas extra | `GET /api/admin/gestos`, `GET /api/admin/acciones`, `GET /api/salud` | El panel de administración necesita ver también lo inactivo. No cambian el contrato existente. |
| Cerrar sesión (RF-03) | Se hace en el navegador | Con JWT el servidor no guarda sesiones; basta con olvidar el token. |
| Puerto `Reloj` y `UnidadDeTrabajo` | Puertos adicionales | Probar reglas con tiempo falso y escribir la bitácora en la misma transacción sin que el núcleo conozca PostgreSQL. |
| Tolerancia de 150 ms | Agregada a las reglas de aceptación | Sin ella, un solo cuadro borroso reinicia el medio segundo y el gesto cuesta más en la demo. No cambia las tres reglas de la SRS. |
| La acción la decide el servidor | `RegistrarDeteccion` resuelve la acción con la configuración del usuario | Así el historial no depende de lo que diga el navegador. |
| Modo simulado | `?simulado=1` | Desarrollo sin cámara, plan B de la demo y demostración de la arquitectura. |
| Fechas en UTC | Ver §5 | Evitar errores de zona horaria entre Railway y Ecuador. |

## 10. Cómo extender el sistema

**Agregar una acción nueva al panel** (por ejemplo `ZOOM`):
1. El administrador la crea en Administración → Acciones (código `ZOOM`).
2. En `panel-demostracion.ts`, dentro de `registrarVarios({...})`, agregar `ZOOM: () => this.acercar()`.
   No se toca el motor, ni el ejecutor, ni el backend (principio abierto/cerrado).

**Cambiar PostgreSQL por MySQL:** escribir `persistencia/mysql/*RepositorioMysql.ts` que implementen los mismos puertos y cambiar `persistenciaPostgres(pool)` por `persistenciaMysql(...)` en `main.ts`. Las pruebas de contrato (`pruebas/postgres/contrato.prueba.ts`) dicen si el nuevo adaptador se comporta igual.

**Usar otro modelo de gestos** (por ejemplo, uno entrenado con gestos propios): crear un adaptador que extienda `ReconocedorGestos` y registrarlo en `app.config.ts`. Si reconoce gestos nuevos, agregarlos a la tabla `gestos` y a `GUIA_GESTOS`.

## 11. Problemas comunes

| Síntoma | Causa y solución |
|---|---|
| `npm run dev` dice "No se pudo usar la base de datos" | PostgreSQL apagado, `DATABASE_URL` mal escrita o falta `npm run db:crear`. |
| `password authentication failed for user "postgres"` | Poner en `DATABASE_URL` la contraseña que elegiste al instalar PostgreSQL. |
| El frontend muestra "No se pudo conectar con el servidor" | El backend no está corriendo en el puerto 3000 o el proxy no aplica (usar `npm start`, no abrir `index.html` directo). |
| "No se pudo cargar el modelo de gestos" | Sin internet y sin modelo local: ejecutar `npm run modelo`. |
| La cámara funciona en localhost pero no en la red local (192.168.x.x) | Esa dirección no es "sitio seguro": usar localhost o https. |
| Error CORS en producción | Agregar el dominio del frontend a `CORS_ORIGENES` o usar la redirección `/api` de `vercel.json`. |
| `ng test` no encuentra Chrome | Instalar Chrome o indicar otro con `CHROME_BIN=/ruta/al/chromium`. |
