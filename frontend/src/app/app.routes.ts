import { Routes } from '@angular/router';
import { soloAdmin, soloConSesion, soloVisitantes } from './compartido/guards';

/** Rutas de la aplicación. Cada página se descarga solo cuando se visita. */
export const routes: Routes = [
  { path: '', title: 'GestoWeb', loadComponent: () => import('./paginas/inicio/inicio').then((m) => m.Inicio) },
  { path: 'entrar', title: 'Iniciar sesión · GestoWeb', canActivate: [soloVisitantes], loadComponent: () => import('./paginas/auth/login').then((m) => m.Login) },
  { path: 'registro', title: 'Crear cuenta · GestoWeb', canActivate: [soloVisitantes], loadComponent: () => import('./paginas/auth/registro').then((m) => m.Registro) },
  { path: 'guia', title: 'Guía de gestos · GestoWeb', loadComponent: () => import('./paginas/guia/guia').then((m) => m.GuiaPagina) },
  { path: 'reconocer', title: 'Reconocer · GestoWeb', canActivate: [soloConSesion], loadComponent: () => import('./paginas/reconocer/reconocer').then((m) => m.Reconocer) },
  { path: 'configuracion', title: 'Mis gestos · GestoWeb', canActivate: [soloConSesion], loadComponent: () => import('./paginas/configuracion/configuracion').then((m) => m.Configuracion) },
  { path: 'historial', title: 'Historial · GestoWeb', canActivate: [soloConSesion], loadComponent: () => import('./paginas/historial/historial').then((m) => m.Historial) },
  { path: 'estadisticas', title: 'Estadísticas · GestoWeb', canActivate: [soloConSesion], loadComponent: () => import('./paginas/estadisticas/estadisticas').then((m) => m.EstadisticasPagina) },
  { path: 'perfil', title: 'Mi perfil · GestoWeb', canActivate: [soloConSesion], loadComponent: () => import('./paginas/perfil/perfil').then((m) => m.Perfil) },
  {
    path: 'admin',
    canActivate: [soloAdmin],
    loadComponent: () => import('./paginas/admin/admin').then((m) => m.Admin),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'gestos' },
      { path: 'gestos', title: 'Admin · Gestos', loadComponent: () => import('./paginas/admin/admin-gestos').then((m) => m.AdminGestos) },
      { path: 'acciones', title: 'Admin · Acciones', loadComponent: () => import('./paginas/admin/admin-acciones').then((m) => m.AdminAcciones) },
      { path: 'usuarios', title: 'Admin · Usuarios', loadComponent: () => import('./paginas/admin/admin-usuarios').then((m) => m.AdminUsuarios) },
      { path: 'estadisticas', title: 'Admin · Estadísticas', loadComponent: () => import('./paginas/admin/admin-estadisticas').then((m) => m.AdminEstadisticas) },
      { path: 'bitacora', title: 'Admin · Bitácora', loadComponent: () => import('./paginas/admin/admin-bitacora').then((m) => m.AdminBitacora) },
    ],
  },
  { path: '**', redirectTo: '' },
];
