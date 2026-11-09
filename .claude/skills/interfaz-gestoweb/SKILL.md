---
name: interfaz-gestoweb
description: Sistema de diseño de GestoWeb con dirección "instrumento técnico" (papel cálido, tinta grafito, retícula, líneas en vez de tarjetas, datos en monoespaciada, un solo acento rojo señal, íconos de gestos dibujados como el esqueleto de 21 puntos de MediaPipe). Usar SIEMPRE antes de crear o modificar pantallas, estilos, componentes, gráficos o textos visibles del frontend Angular, y para auditar si una pantalla se ve genérica o "hecha por IA".
---

# Interfaz · GestoWeb

GestoWeb es un **instrumento de medición**: una cámara lee la mano, mide la confianza y registra lo que pasó. La interfaz se tiene que ver como eso: un cuaderno de laboratorio o el panel de un aparato, no una landing de una startup.

Tres ideas guían cada decisión:
1. **Papel y tinta.** Fondo de papel cálido, texto grafito y líneas finas. La estructura la marcan las reglas y la retícula, no las cajas con sombra.
2. **El dato manda.** Cifras, códigos y tiempos en monoespaciada, alineados y con unidades. Las etiquetas son pequeñas y en mayúsculas.
3. **Una sola señal.** El rojo aparece solo en lo que está activo o en lo que exige atención. Si todo es rojo, nada lo es.

---

## 1. Prohibido (rasgos de interfaz genérica)

Si una pantalla tiene cualquiera de estos rasgos, no se entrega:

| ✗ No | ✓ Sí |
|---|---|
| Emojis como íconos (✋ ☝️ 👍), también en tablas y logo | Componente `<app-icono-gesto>` con el esqueleto de puntos (sección 4) |
| Tarjetas blancas con `border-radius` ≥ 8 px, borde suave y sombra | Bloques separados por reglas de 1 px; radio máximo de 2 px |
| Portada con título grande, dos botones y una tarjeta brillante al lado | Portada como "ficha técnica": qué mide, cómo, qué se envía al servidor (sección 6) |
| Tres columnas de "Cómo funciona" con ícono, título y texto | Pasos numerados `01 02 03` en una lista con reglas |
| Tarjetas de cifra (número enorme + etiqueta) en fila | Tabla de lecturas: etiqueta mono a la izquierda, valor alineado a la derecha |
| Degradados, brillos (`radial-gradient` detrás de un ícono), glassmorphism | Colores planos. El único fondo oscuro es el visor de la cámara |
| Etiquetas en forma de píldora (`border-radius: 999px`) | Etiqueta rectangular con borde de 1 px, texto mono en mayúsculas |
| Pestañas subrayadas de manual | Índice de secciones con número: `01 Gestos  02 Acciones …`; la activa con tinta llena |
| Aviso flotante centrado y oscuro | Línea de registro abajo a la izquierda: `14:32:07  GESTO ACEPTADO  Victoria` |
| Chart.js con colores por defecto, curvas suavizadas y relleno de área | Gráfico de instrumento (sección 5) |
| Azul cobalto o violeta de SaaS; fuentes Inter, Poppins o Bricolage | Paleta y tipografía de la sección 2 |
| Textos de marketing ("Controla la página con un gesto de tu mano", "¡Listo!", "Increíble") | Textos directos y medibles (sección 7) |
| `✔`, `✖`, `🚀` en mensajes o logs | Palabras: `OK`, `ERROR`, `AVISO` |

---

## 2. Tokens

Se definen una sola vez en `src/styles.scss`. **Ningún color, fuente o radio se escribe a mano en un componente.**

```scss
:root {
  /* Superficies */
  --papel: #f4f1ea;          /* fondo general */
  --papel-hundido: #ebe6da;  /* zonas secundarias, filas alternas */
  --hoja: #fbf9f4;           /* formularios y tablas cuando necesitan resaltar */
  --visor: #141412;          /* solo el escenario de la cámara */

  /* Tinta */
  --tinta: #1b1b18;          /* texto y trazos principales */
  --tinta-media: #55534b;    /* texto secundario */
  --tinta-tenue: #77736a;    /* etiquetas, ejes, ayudas */
  --regla: #d6d0c1;          /* líneas de 1 px */
  --regla-fuerte: #b9b2a1;   /* reglas de sección */
  --reticula: #e0d9ca;       /* puntos o líneas de la retícula */

  /* Señales */
  --senal: #c8281e;          /* acento único: activo, gesto aceptado, acción principal */
  --senal-tenue: #f3dcd6;
  --correcto: #2f6b3a;
  --atencion: #9a6a00;

  /* Tipografía */
  --fuente-texto: 'IBM Plex Sans', system-ui, sans-serif;
  --fuente-titulo: 'IBM Plex Sans Condensed', 'IBM Plex Sans', sans-serif;
  --fuente-dato: 'IBM Plex Mono', ui-monospace, monospace;

  /* Medidas */
  --radio: 2px;
  --trazo: 1px;
  --trazo-fuerte: 2px;
  --paso: 8px;               /* todo espaciado es múltiplo de 8 (4 para ajustes finos) */
  --ancho-max: 72rem;
  color-scheme: light;
}
```

- Fuentes con `@fontsource/ibm-plex-sans` (400, 600), `@fontsource/ibm-plex-sans-condensed` (600, 700) y `@fontsource/ibm-plex-mono` (400, 500), registradas en `angular.json`. Se quitan Bricolage y Atkinson.
- Contraste mínimo 4.5:1 para texto. `--tinta-tenue` solo se usa en textos de 14 px o más, o en ejes de gráficos.
- El rojo `--senal` nunca es fondo de un bloque grande: es trazo, texto, marca o relleno de un botón.

---

## 3. Componentes base

| Componente | Regla |
|---|---|
| **Retícula** | `body` lleva una retícula de puntos de `--reticula` cada 24 px (`background-image: radial-gradient(var(--reticula) 1px, transparent 1px); background-size: 24px 24px`). En tablas y formularios el fondo es `--hoja` para que no se cruce con el texto. |
| **Encabezado de página** | Línea mono pequeña con número y ruta (`03 / HISTORIAL`), título en `--fuente-titulo` y una regla de `--trazo-fuerte` debajo. Sin subtítulos de relleno. |
| **Sección** | Separada con una regla de 1 px y una etiqueta mono en mayúsculas (`LECTURAS`, `REGISTRO`). Sin cajas. |
| **Etiqueta de dato** | `font: 500 0.75rem var(--fuente-dato); text-transform: uppercase; letter-spacing: 0.08em; color: var(--tinta-tenue)`. |
| **Valor** | `--fuente-dato`, `font-variant-numeric: tabular-nums`, con unidad: `86 %`, `0,87`, `540 ms`. |
| **Botón principal** | Rectangular, fondo `--tinta`, texto `--papel`, radio `--radio`. **Uno por pantalla** puede ir en `--senal`: la acción que la pantalla existe para hacer (p. ej. "Encender cámara"). |
| **Botón secundario** | Fondo transparente, borde de 1 px `--tinta`. |
| **Campo** | Etiqueta mono arriba, input con borde inferior de 1 px (sin caja completa), foco con borde inferior de 2 px `--senal`. |
| **Tabla** | Encabezados como etiquetas de dato, filas separadas por `--regla`, números alineados a la derecha, sin hover de color (solo regla más oscura). |
| **Estado** | Rectángulo con borde de 1 px y texto mono: `ACTIVO`, `INACTIVO`, `ADMIN`. Colores: tinta, tinta-tenue o señal. |
| **Registro de avisos** | Abajo a la izquierda, fondo `--hoja`, borde superior de 2 px del color del tipo, una línea con hora mono + tipo + mensaje. Desaparece a los 5 s. |
| **Navegación** | Barra de papel con regla inferior. Enlaces en texto; el activo, subrayado de 2 px `--senal`. El nombre "GestoWeb" en `--fuente-titulo` con un marcador de 21 puntos pequeño, sin círculo amarillo. |
| **Indicador de modo simulado** | Franja con rayas diagonales de `--atencion` muy tenue y texto mono `MODO SIMULADO · cámara y reconocedor de prueba`. |
| **Foco visible** | `outline: 2px solid var(--senal); outline-offset: 2px`. |

---

## 4. Íconos de gestos: esqueleto de puntos

Los 7 gestos se dibujan con los **21 puntos de la mano de MediaPipe** (0 = muñeca; 1-4 pulgar; 5-8 índice; 9-12 medio; 13-16 anular; 17-20 meñique), unidos por las mismas conexiones que dibuja el visor. Así el ícono, el visor de la cámara y la guía cuentan la misma historia.

- Componente único: `compartido/componentes/icono-gesto.ts` → `<app-icono-gesto [codigo]="'Victory'" [tamano]="48" />`.
- Las coordenadas viven en `nucleo/dominio/esqueletos-gesto.ts` como `Record<CodigoGesto, [x, y][]>` normalizadas en 0..1. No hay SVG sueltos por gesto.
- Dibujo: `viewBox="0 0 100 100"`, líneas `stroke: currentColor; stroke-width: 2.5; stroke-linecap: round`, puntos `r=3` con relleno `--papel` y borde `currentColor`. La punta de los dedos extendidos lleva un punto relleno de `--senal`.
- Color por defecto: `--tinta`. En el visor: trazos `--papel` y puntas `--senal`.
- Siempre con `role="img"` y `aria-label` con el nombre del gesto, o `aria-hidden="true"` si el nombre ya está escrito al lado.
- El campo `icono` con emojis se elimina de `GUIA_GESTOS`.

---

## 5. Gráficos (Chart.js)

Toda configuración sale de `compartido/componentes/grafico.ts`, que lee los tokens con `getComputedStyle`.

- Barras: relleno `--tinta`; la barra destacada (el gesto más usado o el seleccionado) en `--senal`. `borderRadius: 0`, `maxBarThickness: 18`.
- Líneas: `tension: 0`, `stepped: false`, `fill: false`, `borderWidth: 1.5`, puntos de 2 px y solo en el último valor un punto `--senal` con su valor escrito.
- Ejes: ticks en `--fuente-dato` de 11 px `--tinta-tenue`; rejilla solo horizontal, punteada (`borderDash: [2, 3]`), color `--regla`. Sin borde de eje izquierdo.
- Sin leyenda si hay una sola serie: el título de la sección ya dice qué es.
- Sin animación de entrada (`animation: false`). Tooltip con fondo `--tinta`, texto mono, sin esquinas redondeadas.
- Debajo de cada gráfico, una tabla o línea de lectura con los valores exactos (accesibilidad y defensa del dato).

---

## 6. Composición por pantalla

| Pantalla | Composición |
|---|---|
| **Inicio** | Dos columnas: izquierda, ficha del instrumento (título corto, 3 lecturas: `GESTOS 07`, `LATENCIA OBJETIVO <500 ms`, `IMÁGENES ENVIADAS 0`, y los pasos `01 02 03`); derecha, el esqueleto animado recorriendo los 7 gestos con su código (`POINTING_UP`). Un solo botón principal. |
| **Reconocer** | Pantalla principal del instrumento. Visor oscuro grande con esquinas de encuadre; a su lado, panel de lectura: gesto actual (ícono + nombre + código), barra de confianza segmentada en 10 tramos con el umbral marcado, estado (`ESPERANDO`, `ESTABILIZANDO 320/500 ms`, `ACEPTADO`), acción ejecutada y contador de la sesión. Debajo, la tira de 7 gestos como una regla numerada `1-7`, no como tarjetas. |
| **Historial** | Tabla de registro con hora mono, gesto, confianza y acción; filtros en una sola línea arriba. Exportar CSV como botón secundario. |
| **Estadísticas** | Bloque de lecturas en tabla (total, confianza media, gesto más usado), luego los dos gráficos uno debajo del otro a todo el ancho. |
| **Configuración (Mis gestos)** | Tabla de dos columnas `GESTO → ACCIÓN` con el ícono a la izquierda y un `select` subrayado a la derecha. |
| **Guía** | Lámina: cada gesto con ícono grande, código, cómo hacerlo y el error típico, en una retícula de 2 columnas separada por reglas. |
| **Administración** | Índice numerado de secciones; tablas densas; acciones destructivas como texto rojo subrayado con confirmación. |
| **Entrar / Registro** | Formulario angosto (28 rem) alineado a la izquierda de la retícula, con una nota mono de qué datos se guardan. |

En pantallas angostas (< 760 px): una columna, el visor primero, la navegación pasa a una línea desplazable horizontalmente y las tablas se vuelven listas de pares etiqueta/valor.

---

## 7. Textos

- **Español neutro, tú, frases cortas.** Una idea por frase.
- **Medible antes que entusiasta:** "Mantén el gesto 0,5 s" en vez de "¡Haz tu gesto favorito!".
- Títulos de 1 a 3 palabras: `Reconocer`, `Historial`, `Mis gestos`.
- Estados en mayúsculas mono y en infinitivo o participio: `ESPERANDO`, `ACEPTADO`, `DESCARTADO · confianza baja`.
- Errores: qué pasó y qué hacer. "No hay permiso para usar la cámara. Actívalo en el candado de la barra de direcciones."
- Sin signos de exclamación, sin emojis, sin "increíble", "mágico", "potente", "fácil".

---

## 8. Movimiento

- Solo transiciones de 120-160 ms en color y borde. Nada rebota ni se desliza.
- La barra de confianza se actualiza por tramos, sin interpolar.
- El esqueleto del inicio cambia de gesto cada 2,5 s, sin fundidos.
- `prefers-reduced-motion: reduce` detiene la animación del inicio.

---

## 9. Lista de verificación antes de entregar una pantalla

```
[ ] Ningún emoji (grep -rnP "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" frontend/src)
[ ] Ningún color, fuente o radio literal fuera de styles.scss (grep -rnE "#[0-9a-fA-F]{3,6}|border-radius: ?([3-9]|[1-9][0-9])px" frontend/src/app)
[ ] Sin box-shadow ni gradientes salvo la retícula y las rayas de la franja de modo simulado (grep -rnE "box-shadow|linear-gradient" frontend/src/app)
[ ] Todos los números con fuente de dato y unidad
[ ] Un solo botón en --senal por pantalla
[ ] Íconos de gesto solo con <app-icono-gesto>
[ ] Foco visible y navegación con teclado completa
[ ] Probado a 375 px y a 1280 px (captura en docs/capturas/ si cambió)
[ ] Textos revisados contra la sección 7
```

Si alguna regla no se puede cumplir, se reporta igual que en la skill `arquitectura-hexagonal` (formato DESVIACIÓN).
