import { InjectionToken } from '@angular/core';

/** true cuando la app usa la cámara y el reconocedor simulados (?simulado=1). */
export const MODO_SIMULADO = new InjectionToken<boolean>('MODO_SIMULADO');
