import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SesionUsuario } from './servicios/sesion-usuario';

/** Pantallas privadas: exigen sesión iniciada (RF-04). */
export const soloConSesion: CanActivateFn = (_ruta, estado) => {
  const sesion = inject(SesionUsuario);
  const router = inject(Router);
  if (sesion.vencida()) sesion.cerrar();
  return sesion.autenticado() ? true : router.createUrlTree(['/entrar'], { queryParams: { volver: estado.url } });
};

/** Pantallas de administración: además, rol ADMIN. El servidor lo vuelve a comprobar. */
export const soloAdmin: CanActivateFn = (ruta, estado) => {
  const permitido = soloConSesion(ruta, estado);
  if (permitido !== true) return permitido;
  return inject(SesionUsuario).esAdmin() ? true : inject(Router).createUrlTree(['/reconocer']);
};

/** Entrar y registrarse no tienen sentido con la sesión ya iniciada. */
export const soloVisitantes: CanActivateFn = () =>
  inject(SesionUsuario).autenticado() ? inject(Router).createUrlTree(['/reconocer']) : true;
