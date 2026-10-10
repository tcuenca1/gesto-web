import { ErrorApi, NuevaDeteccion } from '../dominio/modelos';
import { ColaDetecciones, Temporizador } from './cola-detecciones';
import { EjecutorAcciones } from './ejecutor-acciones';

describe('EjecutorAcciones', () => {
  it('ejecuta el manejador registrado para cada código', () => {
    const ejecutor = new EjecutorAcciones();
    let siguiente = 0;
    ejecutor.registrar('SIGUIENTE', () => siguiente++);
    expect(ejecutor.ejecutar('SIGUIENTE')).toBe('ejecutada');
    expect(siguiente).toBe(1);
  });

  it('distingue NINGUNA de una acción sin manejador', () => {
    const ejecutor = new EjecutorAcciones();
    expect(ejecutor.ejecutar('NINGUNA')).toBe('ninguna');
    expect(ejecutor.ejecutar(null)).toBe('ninguna');
    expect(ejecutor.ejecutar('SUBIR_VOLUMEN')).toBe('sin-manejador');
  });

  it('permite quitar los manejadores (al salir de la página)', () => {
    const ejecutor = new EjecutorAcciones();
    const quitar = ejecutor.registrarVarios({ A: () => undefined, B: () => undefined });
    quitar();
    expect(ejecutor.ejecutar('A')).toBe('sin-manejador');
  });
});

describe('ColaDetecciones (flujo 8a: el servidor no responde)', () => {
  const deteccion = (n: number): NuevaDeteccion => ({ codigoGesto: 'Victory', confianza: 0.9, mano: 'Derecha', fechaHora: `2026-10-09T15:00:0${n}Z` });

  /** Temporizador manual: la prueba decide cuándo "pasa el tiempo". */
  function temporizadorManual() {
    const tareas: Array<() => void> = [];
    const t: Temporizador = { programar: (fn) => tareas.push(fn), cancelar: () => (tareas.length = 0) };
    return { t, avanzar: () => tareas.splice(0).forEach((fn) => fn()) };
  }
  const esperar = () => new Promise((r) => setTimeout(r, 0));

  it('envía en orden y vacía la cola', async () => {
    const enviadas: string[] = [];
    const cola = new ColaDetecciones(async (d) => void enviadas.push(d.fechaHora));
    cola.agregar(deteccion(1));
    cola.agregar(deteccion(2));
    await cola.vaciar();
    expect(enviadas.length).toBe(2);
    expect(enviadas[0] < enviadas[1]).toBeTrue();
    expect(cola.cantidadPendientes).toBe(0);
  });

  it('si el servidor no responde, guarda y reintenta después sin perder nada', async () => {
    let caido = true;
    const enviadas: NuevaDeteccion[] = [];
    const reloj = temporizadorManual();
    const cola = new ColaDetecciones(
      async (d) => {
        if (caido) throw new ErrorApi(0, 'sin conexión');
        enviadas.push(d);
      },
      undefined,
      { reintentoMs: 3000, maximoPendientes: 100 },
      reloj.t,
    );
    cola.agregar(deteccion(1));
    cola.agregar(deteccion(2));
    await esperar();
    expect(cola.cantidadPendientes).toBe(2);

    caido = false;
    reloj.avanzar();
    await cola.vaciar();
    expect(enviadas.map((d) => d.fechaHora)).toEqual([deteccion(1).fechaHora, deteccion(2).fechaHora]);
  });

  it('descarta las detecciones con errores permanentes (por ejemplo, 400)', async () => {
    const cola = new ColaDetecciones(async () => {
      throw new ErrorApi(400, 'gesto desactivado');
    });
    cola.agregar(deteccion(1));
    await cola.vaciar();
    expect(cola.cantidadPendientes).toBe(0);
    expect(cola.cantidadDescartadas).toBe(1);
  });
});
