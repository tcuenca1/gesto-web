import { config as cargarEnv } from 'dotenv';

cargarEnv({ quiet: true });

export type ModoRepositorios = 'postgres' | 'memoria';

export interface Configuracion {
  puerto: number;
  produccion: boolean;
  repositorios: ModoRepositorios;
  baseDatos: { url: string; ssl: boolean };
  jwt: { secreto: string; duracionSegundos: number };
  corsOrigenes: string[];
  zonaHoraria: string;
  /** Carpeta del frontend compilado. Si existe, el backend también lo sirve. */
  carpetaFrontend: string | null;
}

const SECRETO_DESARROLLO = 'solo-para-desarrollo-cambiame-en-produccion';

function leerDuracion(texto: string | undefined): number {
  if (!texto) return 8 * 60 * 60;
  const m = /^(\d+)\s*([smhd]?)$/.exec(texto.trim());
  if (!m) throw new Error(`JWT_EXPIRACION inválida: "${texto}". Ejemplos: 8h, 30m, 3600`);
  const factor = { '': 1, s: 1, m: 60, h: 3600, d: 86400 }[m[2] as '' | 's' | 'm' | 'h' | 'd'];
  return Number(m[1]) * factor;
}

/** Lee las variables de entorno (archivo .env) una sola vez. */
export function leerConfiguracion(env: NodeJS.ProcessEnv = process.env): Configuracion {
  const produccion = env.NODE_ENV === 'production';
  const secreto = env.JWT_SECRETO ?? (produccion ? '' : SECRETO_DESARROLLO);
  if (produccion && secreto.length < 32) {
    throw new Error('En producción JWT_SECRETO es obligatorio y debe tener al menos 32 caracteres');
  }
  const repositorios = (env.REPOSITORIOS ?? 'postgres') as ModoRepositorios;
  if (!['postgres', 'memoria'].includes(repositorios)) throw new Error('REPOSITORIOS debe ser "postgres" o "memoria"');

  return {
    puerto: Number(env.PORT ?? env.PUERTO ?? 3000),
    produccion,
    repositorios,
    baseDatos: {
      url: env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/gestoweb',
      ssl: env.PGSSL === 'true',
    },
    jwt: { secreto, duracionSegundos: leerDuracion(env.JWT_EXPIRACION) },
    corsOrigenes: (env.CORS_ORIGENES ?? 'http://localhost:4200').split(',').map((o) => o.trim()).filter(Boolean),
    zonaHoraria: env.ZONA_HORARIA ?? 'America/Guayaquil',
    carpetaFrontend: env.CARPETA_FRONTEND?.trim() || null,
  };
}
