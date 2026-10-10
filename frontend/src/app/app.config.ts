import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { CamaraNavegador } from './adaptadores/camara/camara-navegador';
import { ApiGestoWebHttp } from './adaptadores/http/api-gestoweb-http';
import { interceptorToken } from './adaptadores/http/interceptor-token';
import { ReconocedorMediaPipe } from './adaptadores/mediapipe/reconocedor-mediapipe';
import { CamaraSimulada, ReconocedorSimulado } from './adaptadores/simulado/adaptadores-simulados';
import { ApiGestoWeb } from './nucleo/puertos/api-gestoweb';
import { Camara } from './nucleo/puertos/camara';
import { ReconocedorGestos } from './nucleo/puertos/reconocedor-gestos';
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
    { provide: ApiGestoWeb, useClass: ApiGestoWebHttp },
    { provide: Camara, useFactory: () => (simulado ? new CamaraSimulada() : new CamaraNavegador()) },
    { provide: ReconocedorGestos, useFactory: () => (simulado ? new ReconocedorSimulado() : new ReconocedorMediaPipe()) },
    { provide: MODO_SIMULADO, useValue: simulado },
  ],
};
