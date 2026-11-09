# Revisión del proyecto con las skills

Fecha: 2026-11-08 · Rama: `refactor/skills-hexagonal-interfaz` · Línea base: backend 51/51 pruebas, `typecheck` sin errores.

Resultado de aplicar la auditoría de `arquitectura-hexagonal` (§10) y la lista de verificación de `interfaz-gestoweb` (§9) sobre el commit `4efd402`.

## 1. Arquitectura (OBS-01)

### Lo que ya cumple
- El dominio no importa nada de afuera (auditoría 1: 0 hallazgos).
- La aplicación no importa infraestructura ni librerías (auditoría 2: 0 hallazgos).
- Existe la versión en memoria de todos los repositorios y una prueba de contrato (P-09).

### Hallazgos

| # | Hallazgo | Dónde | Regla |
|---|---|---|---|
| A-01 | Puertos de salida como `interface` con nombres `*Repositorio`, `servicios.ts` agrupa 3 puertos | `aplicacion/puertos/salida/` | §1.1, §1.3 |
| A-02 | Puertos de entrada como alias de `CasoDeUso<E,S>`; un caso de uso por clase sin separar lectura y escritura | `aplicacion/puertos/entrada/`, `aplicacion/casos-uso/` | §1.4 |
| A-03 | No hay adaptadores de entrada como clases: 3 `Router()` llaman directamente a los casos de uso | `infraestructura/http/rutas/` | §1.6, §1.8 |
| A-04 | La infraestructura importa una utilidad interna de los casos de uso (`leerEnteroPositivo`) | `rutasAdmin.ts`, `rutasUsuario.ts` | §1.6 |
| A-05 | Varias clases por archivo en los adaptadores (8 en `RepositoriosMemoria.ts`, 3 en `CatalogoRepositoriosPg.ts`, …) y en 3 archivos de casos de uso | `infraestructura/persistencia/`, `aplicacion/casos-uso/` | §1.2 |
| A-06 | El cableado está repartido entre `main.ts` y `aplicacion/casos-uso/index.ts` (la aplicación se arma a sí misma); no existe `contenedor/` | `main.ts`, `casos-uso/index.ts` | §1.5 |
| A-07 | DTOs mezclados con los contratos de entrada | `puertos/entrada/dtos.ts` | §3 |
| A-08 | `config/entorno.ts` fuera de las capas | `src/config/` | §2 |
| A-09 | Frontend: página `reconocer.ts` importa un adaptador concreto (`ReconocedorSimulado`) | `paginas/reconocer/` | §7 |
| A-10 | Frontend: nombres sin el vocabulario de clase (`ApiGestoWeb`, `Camara`, `MotorReconocimiento`) y 2 archivos con 2 clases | `nucleo/`, `adaptadores/simulado/` | §7 |

Excepción aceptada: `dominio/compartido/errores.ts` contiene la jerarquía de 6 errores; se deja junta porque es una sola familia de tipos.

## 2. Interfaz (OBS-02)

| # | Hallazgo | Cantidad |
|---|---|---|
| U-01 | Emojis usados como íconos (logo, gestos, tablas, estadísticas, administración, reconocer) | 7 archivos |
| U-02 | Radios de borde de 3 px o más (tarjetas de 12 px, píldoras de 999 px) | 26 |
| U-03 | Colores escritos a mano en componentes | 33 |
| U-04 | Sombras y degradados | 4 |
| U-05 | Paleta cobalto de SaaS y Bricolage Grotesque / Atkinson | global |
| U-06 | Portada con fórmula de landing (título, 2 botones, tarjeta brillante, "Cómo funciona" en 3 columnas) | inicio |
| U-07 | Tarjetas de cifra en estadísticas; Chart.js con curva suavizada y relleno | estadísticas |
| U-08 | Aviso flotante centrado, pestañas subrayadas, etiquetas píldora | global |
| U-09 | Logs con `✔`/`✖` en el backend | `main.ts`, scripts |

## 3. Plan de commits

Cada commit compila y pasa las pruebas. Los refactors no cambian aserciones (skill `pruebas-por-capa` §2.7).

| # | Commit | Resuelve |
|---|---|---|
| 1 | `refactor(backend): convertir puertos de salida en clases PuertoSalida*` | A-01 |
| 2 | `refactor(backend): separar adaptadores de salida en AdapSalida_*Postgres y AdapSalida_*Memoria` | A-05 |
| 3 | `refactor(backend): renombrar servicios externos a AdapSalida_CifradorBcrypt, TokensJwt y RelojSistema` | A-01 |
| 4 | `refactor(backend): mover DTOs a aplicacion/dto` | A-07 |
| 5 | `refactor(backend): agrupar casos de uso en CasoUso_<Modulo>Lectura y Escritura con PuertoEntrada*` | A-02, A-05 |
| 6 | `refactor(backend): reemplazar routers por adaptadores AdapEntrada_*Web y rutas en app.ts` | A-03, A-04 |
| 7 | `refactor(backend): cablear dependencias en contenedor/ y mover entorno a infraestructura/util` | A-06, A-08, U-09 |
| 8 | `docs: actualizar estructura y guía de arquitectura` | A-01…A-08 |
| 9 | `refactor(frontend): alinear núcleo y adaptadores con la nomenclatura de clase` | A-09, A-10 |
| 10 | `ui(frontend): aplicar tokens, tipografía IBM Plex y retícula` | U-02…U-05 |
| 11 | `ui(frontend): reemplazar emojis por íconos de esqueleto de puntos` | U-01 |
| 12 | `ui(frontend): rediseñar barra, avisos y franja de modo simulado` | U-08 |
| 13 | `ui(frontend): rediseñar inicio como ficha del instrumento` | U-06 |
| 14 | `ui(frontend): rediseñar reconocer y panel de demostración` | U-01, U-02 |
| 15 | `ui(frontend): rediseñar historial, estadísticas y gráficos` | U-07 |
| 16 | `ui(frontend): rediseñar configuración, guía, perfil y acceso` | U-02, U-03 |
| 17 | `ui(frontend): rediseñar administración` | U-08 |
| 18 | `docs: regenerar capturas y manual de usuario` | OBS-02 |
| 19 | `docs: cerrar observaciones OBS-01 y OBS-02` | — |
