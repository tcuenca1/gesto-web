/**
 * Recorrido de extremo a extremo en modo simulado (sin cámara).
 *
 * Requisitos:
 *   1. Base de datos recién creada:  cd backend && npm run db:crear
 *   2. Frontend compilado y servido por el backend:
 *        cd frontend && npm run build
 *        cd backend && CARPETA_FRONTEND=../frontend/dist/gestoweb/browser npm start
 *   3. Puppeteer (descarga su propio Chrome):  cd frontend && npm i -D puppeteer
 *
 * Ejecutar:  node e2e/recorrido.mjs          (desde la carpeta frontend)
 * Las capturas quedan en ../docs/capturas.
 */
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const BASE = process.env.BASE ?? 'http://localhost:3000';
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../docs/capturas');
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const resultados = [];
const ok = (nombre, cond, extra = '') => { resultados.push(`${cond ? '✔' : '✖'} ${nombre} ${extra}`); };

const b = await puppeteer.launch({ headless: true, defaultViewport: { width: 1366, height: 860 } });
const p = await b.newPage();
const errores = [];
p.on('pageerror', (e) => errores.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errores.push('console: ' + m.text()); });

// Registro de peticiones para P-04
const peticiones = [];
p.on('request', (r) => peticiones.push({ url: r.url(), metodo: r.method(), bytes: (r.postData() ?? '').length, cuerpo: r.postData() ?? '' }));

const shot = async (nombre, opciones = {}) => { await esperar(350); await p.screenshot({ path: `${OUT}/${nombre}.png`, ...opciones }); };
const clic = async (texto, selector = 'button, a') => {
  const els = await p.$$(selector);
  for (const el of els) { const t = await el.evaluate((e) => e.textContent.trim()); if (t === texto || t.startsWith(texto)) { await el.click(); return true; } }
  throw new Error('No encontré ' + texto);
};

// 1. Inicio
await p.goto(BASE + '/?simulado=1', { waitUntil: 'networkidle0' });
await shot('01-inicio');

// 2. Registro
await p.goto(BASE + '/registro', { waitUntil: 'networkidle0' });
await p.type('#nombre', 'Juan Paladines');
await p.type('#correo', 'juan@demo.ec');
await p.type('#contrasena', 'Demo1234');
await shot('02-registro');
await clic('Crear cuenta', 'button');
await p.waitForFunction(() => location.pathname === '/reconocer', { timeout: 8000 });
ok('Registro lleva a /reconocer', true);
await shot('03-reconocer-apagado');

// 3. Encender cámara simulada
await clic('Encender cámara', 'button');
await p.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => b.textContent.includes('Apagar cámara')), { timeout: 8000 });
ok('Cámara simulada encendida', true);


async function hacerGesto(codigoNombre, ms) {
  const tarjetas = await p.$$('.tarjeta-gesto--boton');
  for (const t of tarjetas) {
    const n = await t.evaluate((e) => e.querySelector('.tarjeta-gesto__nombre').textContent.trim());
    if (n === codigoNombre) {
      await t.evaluate((e) => e.scrollIntoView({ block: 'center' }));
      await esperar(150);
      const caja = await t.boundingBox();
      await p.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
      await p.mouse.down();
      await esperar(ms);
      return async () => p.mouse.up();
    }
  }
  throw new Error('sin tarjeta ' + codigoNombre);
}
const contador = () => p.$eval('.visor__contador', (e) => e.textContent.trim());

const antes = await contador();
let soltar = await hacerGesto('Índice arriba', 1000); await soltar(); await esperar(300);
const despues = await contador();
ok('Índice arriba → siguiente imagen', antes !== despues, `(${antes} → ${despues})`);

soltar = await hacerGesto('Pulgar arriba', 1000); await soltar(); await esperar(300);
ok('Pulgar arriba → favorita', !!(await p.$('.visor--favorita')));

soltar = await hacerGesto('Palma abierta', 1000); await soltar(); await esperar(200);
ok('Palma abierta → pase automático', !!(await p.$('.chip--vivo')));

// Captura a mitad de estabilización y luego aceptada con corazón
soltar = await hacerGesto('Te quiero', 200);
await p.screenshot({ path: `${OUT}/04-reconocer-estabilizando.png` });
await esperar(450);
await p.screenshot({ path: `${OUT}/05-reconocer-aceptado.png` });
await soltar();
await esperar(300);

soltar = await hacerGesto('Puño cerrado', 1000); await soltar(); await esperar(300);
ok('Puño cerrado → detener y volver al inicio', (await contador()).startsWith('1 de') && !(await p.$('.chip--vivo')));

// Repetición manteniendo el gesto: índice arriba 2.7 s → 3 avances
const c0 = await contador();
soltar = await hacerGesto('Índice arriba', 2950); await soltar(); await esperar(300);
const c1 = await contador();
ok('Mantener índice arriba ~3 s avanza 3 imágenes (pausa de 1 s)', parseInt(c1) - parseInt(c0) === 3, `(${c0} → ${c1})`);

await shot('06-reconocer-panel');
await clic('Apagar cámara', 'button');
await esperar(1500);

// Historial real
const tokenUsuario = await p.evaluate(() => JSON.parse(localStorage.getItem('gestoweb.sesion')).token);
const hist = await p.evaluate(async (t) => (await fetch('/api/historial?limite=50', { headers: { Authorization: 'Bearer ' + t } })).json(), tokenUsuario);
ok('Detecciones guardadas en el historial', hist.total >= 8, `(${hist.total})`);

// P-04: ninguna petición lleva imágenes
const conCuerpo = peticiones.filter((r) => r.bytes > 0);
const maximo = Math.max(...conCuerpo.map((r) => r.bytes));
const sospechosas = conCuerpo.filter((r) => /image|base64|data:/.test(r.cuerpo) || r.bytes > 2000);
ok('P-04 Privacidad: ninguna petición lleva imágenes', sospechosas.length === 0, `(${conCuerpo.length} peticiones con cuerpo, la mayor de ${maximo} bytes)`);

await p.goto(BASE + '/historial', { waitUntil: 'networkidle0' });
await shot('07-historial');
await p.goto(BASE + '/estadisticas', { waitUntil: 'networkidle0' });
await esperar(600);
await shot('08-estadisticas', { fullPage: true });
await p.goto(BASE + '/configuracion', { waitUntil: 'networkidle0' });
await p.select('#accion-7', '3'); // Te quiero → siguiente imagen
await esperar(600);
await shot('09-configuracion');
await p.goto(BASE + '/guia', { waitUntil: 'networkidle0' });
await shot('10-guia');

// Descarga CSV
const csv = await p.evaluate(async (t) => { const r = await fetch('/api/historial/csv', { headers: { Authorization: 'Bearer ' + t } }); return { tipo: r.headers.get('content-type'), texto: (await r.text()).slice(0, 200) }; }, tokenUsuario);
ok('CSV descargable', csv.tipo.includes('text/csv'), csv.texto.split('\n')[0]);

// P-05 desde el navegador: usuario normal no entra a /admin
await p.goto(BASE + '/admin', { waitUntil: 'networkidle0' });
ok('P-05 Usuario normal redirigido fuera de /admin', !(p.url()).includes('/admin'), p.url());
const r403 = await p.evaluate(async (t) => (await fetch('/api/admin/usuarios', { headers: { Authorization: 'Bearer ' + t } })).status, tokenUsuario);
ok('P-05 API de admin con usuario normal = 403', r403 === 403);

// Admin
await clic('Cerrar sesión', 'button');
await p.goto(BASE + '/entrar', { waitUntil: 'networkidle0' });
await p.type('#correo', 'admin@gestoweb.local');
await p.type('#contrasena', 'Admin123!');
await clic('Iniciar sesión', 'button');
await p.waitForFunction(() => location.pathname === '/reconocer');
await p.goto(BASE + '/admin/gestos', { waitUntil: 'networkidle0' });
// Cambiar el umbral de Índice arriba con el teclado
const rango = await p.$('#u3');
await rango.focus();
for (let i = 0; i < 10; i++) await p.keyboard.press('ArrowRight');
const formulario = (await p.$$('form.gesto'))[2];
await (await formulario.$('button[type=submit]')).click();
await esperar(700);
await p.evaluate(() => window.scrollTo(0, 0));
await shot('11-admin-gestos');
await p.goto(BASE + '/admin/usuarios', { waitUntil: 'networkidle0' });
await shot('12-admin-usuarios');
await p.goto(BASE + '/admin/estadisticas', { waitUntil: 'networkidle0' });
await esperar(600);
await shot('13-admin-estadisticas', { fullPage: true });
await p.goto(BASE + '/admin/bitacora', { waitUntil: 'networkidle0' });
await shot('14-admin-bitacora');
const bit = await p.$$eval('.cambios li', (l) => l.map((x) => x.textContent.trim()));
ok('Bitácora registra el cambio de umbral', bit.some((t) => t.includes('umbralConfianza')), bit[0] ?? '');

// Tableta (RNF-10)
await p.setViewport({ width: 820, height: 1180 });
await p.goto(BASE + '/reconocer', { waitUntil: 'networkidle0' });
await shot('15-tableta-reconocer');

// RF-10: modo real sin modelo ni cámara en este servidor → mensaje claro
await p.setViewport({ width: 1366, height: 860 });
await p.goto(BASE + '/reconocer?simulado=0', { waitUntil: 'networkidle0' });
await clic('Encender cámara', 'button');
await p.waitForFunction(() => document.querySelector('[role=alert]'), { timeout: 20000 }).catch(() => null);
await esperar(300);
const msg = await p.$eval('.escenario', (e) => e.textContent).catch(() => '');
ok('RF-10 Mensaje claro si falla el modelo o la cámara', /No se pudo empezar/.test(msg), `(${msg.split('\n').slice(1, 2).join('')})`);
await shot('16-error-camara');

console.log(resultados.join('\n'));
console.log('\nErrores de la página:', errores.filter((e) => !/storage\.googleapis|ERR_|Failed to load resource|tasks-vision|vision_wasm|404/.test(e)).slice(0, 10));
await b.close();
