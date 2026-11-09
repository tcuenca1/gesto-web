import { TestBed } from '@angular/core/testing';
import { Asignacion, NuevaDeteccion } from '../dominio/modelos';
import { ResultadoReconocimiento } from '../dominio/gesto';
import { PuertoSalidaApiGestoWeb } from '../puerto/salida/puerto-salida-api-gestoweb';
import { PuertoSalidaCamara } from '../puerto/salida/puerto-salida-camara';
import { PuertoSalidaReconocedor } from '../puerto/salida/puerto-salida-reconocedor';
import { CasoUso_MotorReconocimiento } from './caso-uso-motor-reconocimiento';

/**
 * El motor se prueba con adaptadores falsos para la cámara, el modelo y la API.
 * Es la versión frontend de la prueba P-09: el núcleo no cambia, solo los adaptadores.
 */
class CamaraFalsa extends PuertoSalidaCamara {
  encendida = false;
  async encender() {
    this.encendida = true;
  }
  apagar() {
    this.encendida = false;
  }
}

class ReconocedorFalso extends PuertoSalidaReconocedor {
  async cargar() {}
  reconocer(): ResultadoReconocimiento | null {
    return null;
  }
  liberar() {}
}

const asignaciones: Asignacion[] = [
  {
    gesto: { id: 3, codigo: 'Pointing_Up', nombre: 'Índice arriba', descripcion: null, umbralConfianza: 0.7, idAccionPredeterminada: 3, activo: true },
    accion: { id: 3, codigo: 'SIGUIENTE', nombre: 'Siguiente imagen', descripcion: null, activa: true },
    esPredeterminada: true,
  },
];

describe('CasoUso_MotorReconocimiento', () => {
  let motor: CasoUso_MotorReconocimiento;
  let enviadas: NuevaDeteccion[];
  let sesionesCerradas: number[];

  beforeEach(() => {
    enviadas = [];
    sesionesCerradas = [];
    const apiFalsa: Partial<PuertoSalidaApiGestoWeb> = {
      asignaciones: async () => asignaciones,
      abrirSesion: async () => ({ id: 77, fechaInicio: '', fechaFin: null, navegador: null, totalDetecciones: 0 }),
      cerrarSesion: async (id: number) => {
        sesionesCerradas.push(id);
        return { id, fechaInicio: '', fechaFin: '', navegador: null, totalDetecciones: enviadas.length };
      },
      registrarDeteccion: async (_id: number, d: NuevaDeteccion) => {
        enviadas.push(d);
        return { ...d, id: 1, idSesion: 77, nombreGesto: '', codigoAccion: null, nombreAccion: null };
      },
    };
    TestBed.configureTestingModule({
      providers: [
        CasoUso_MotorReconocimiento,
        { provide: PuertoSalidaCamara, useClass: CamaraFalsa },
        { provide: PuertoSalidaReconocedor, useClass: ReconocedorFalso },
        { provide: PuertoSalidaApiGestoWeb, useValue: apiFalsa },
      ],
    });
    motor = TestBed.inject(CasoUso_MotorReconocimiento);
  });

  afterEach(() => void motor.apagar());

  it('al aceptar un gesto ejecuta su acción y guarda la detección en la sesión', async () => {
    await motor.encender(document.createElement('video'));
    expect(motor.estado()).toBe('activo');

    let siguiente = 0;
    motor.ejecutor.registrar('SIGUIENTE', () => siguiente++);
    const indice: ResultadoReconocimiento = { codigo: 'Pointing_Up', confianza: 0.92, mano: 'Derecha', puntos: [] };
    for (let t = 0; t <= 600; t += 33) motor.procesarResultado(indice, t);

    expect(siguiente).toBe(1);
    expect(motor.ultimaAccion()?.nombreAccion).toBe('Siguiente imagen');
    await motor.apagar();
    expect(enviadas.length).toBe(1);
    expect(enviadas[0]).toEqual(jasmine.objectContaining({ codigoGesto: 'Pointing_Up', confianza: 0.92, mano: 'Derecha' }));
    expect(sesionesCerradas).toEqual([77]);
  });

  it('muestra un mensaje claro si no se puede encender la cámara (RF-10)', async () => {
    const camara = TestBed.inject(PuertoSalidaCamara);
    spyOn(camara, 'encender').and.rejectWith(new Error('NotAllowedError'));
    await motor.encender(document.createElement('video'));
    expect(motor.estado()).toBe('error');
    expect(motor.mensajeError()).toBeTruthy();
  });
});
