import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SesionUsuario } from '../../compartido/servicios/sesion-usuario';

/**
 * Interceptor del token (RNF-07): agrega "Authorization: Bearer …" a cada
 * petición a la API. Si el servidor responde 401 (token vencido o usuario
 * desactivado), cierra la sesión y lleva al inicio de sesión.
 */
export const interceptorToken: HttpInterceptorFn = (peticion, siguiente) => {
  const sesion = inject(SesionUsuario);
  const router = inject(Router);
  const token = sesion.token();
  const esApi = peticion.url.startsWith(environment.apiUrl);
  const esLogin = peticion.url.includes('/auth/');

  const conToken = token && esApi && !esLogin
    ? peticion.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : peticion;

  return siguiente(conToken).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && token && !esLogin) {
        sesion.cerrar();
        void router.navigate(['/entrar'], { queryParams: { vencida: 1 } });
      }
      return throwError(() => error);
    }),
  );
};
