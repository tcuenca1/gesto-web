import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { AdapSalida_CamaraNavegador } from './adaptadores/salida/adap-salida-camara-navegador';
import { AdapSalida_ApiHttp } from './adaptadores/salida/adap-salida-api-http';
import { interceptorToken } from './adaptadores/salida/interceptor-token';
import { AdapSalida_ReconocedorMediaPipe } from './adaptadores/salida/adap-salida-reconocedor-mediapipe';
import { AdapSalida_CamaraSimulada } from './adaptadores/salida/adap-salida-camara-simulada';
import { AdapSalida_ReconocedorSimulado } from './adaptadores/salida/adap-salida-reconocedor-simulado';
import { PuertoSalidaApiGestoWeb } from './nucleo/puerto/salida/puerto-salida-api-gestoweb';
import { PuertoSalidaCamara } from './nucleo/puerto/salida/puerto-salida-camara';
import { PuertoSalidaReconocedor } from './nucleo/puerto/salida/puerto-salida-reconocedor';
import { PuertoSalidaSimuladorGestos } from './nucleo/puerto/salida/puerto-salida-simulador-gestos';
import { routes } from './app.routes';
import { MODO_SIMULADO } from './compartido/modo-simulado';

/**
 * ?simulado=1 lo activa y ?simulado=0 lo desactiva; la elección se recuerda
 * en el navegador para no tener que repetirla en cada página.
 */
function decidirModoSimulado(): boolean {
  try {
    const parametro = new URLSearchParams(location.search).get('simulado');
    if (parametro !== null) localStorage.setItem('gestoweb.simulado', parametro === '1' ? '1' : '0');
    return localStorage.getItem('gestoweb.simulado') === '1';
  } catch {
    return false;
  }
}

const simulado = decidirModoSimulado();

/** En modo simulado el mismo adaptador cumple dos puertos: reconocedor y simulador. */
let reconocedorSimulado: AdapSalida_ReconocedorSimulado | null = null;
const obtenerSimulado = () => (reconocedorSimulado ??= new AdapSalida_ReconocedorSimulado());
const simuladorInactivo: PuertoSalidaSimuladorGestos = { simular: () => undefined };

/**
 * Raíz de composición del frontend: el equivalente a main.ts del backend.
 * Aquí, y solo aquí, se decide qué adaptador cumple cada puerto.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(withInterceptors([interceptorToken])),

    // Puerto → adaptador
    { provide: PuertoSalidaApiGestoWeb, useClass: AdapSalida_ApiHttp },
    { provide: PuertoSalidaCamara, useFactory: () => (simulado ? new AdapSalida_CamaraSimulada() : new AdapSalida_CamaraNavegador()) },
    { provide: PuertoSalidaReconocedor, useFactory: () => (simulado ? obtenerSimulado() : new AdapSalida_ReconocedorMediaPipe()) },
    { provide: PuertoSalidaSimuladorGestos, useFactory: () => (simulado ? obtenerSimulado() : simuladorInactivo) },
    { provide: MODO_SIMULADO, useValue: simulado },
  ],
};
