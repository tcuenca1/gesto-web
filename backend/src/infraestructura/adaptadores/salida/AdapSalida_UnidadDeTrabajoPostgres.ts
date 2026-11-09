import { Pool } from 'pg';
import { RepositoriosTransaccionales, PuertoSalidaUnidadDeTrabajo } from '../../../aplicacion/puerto/salida/PuertoSalidaUnidadDeTrabajo';
import { AdapSalida_AccionPostgres } from './AdapSalida_AccionPostgres';
import { AdapSalida_BitacoraPostgres } from './AdapSalida_BitacoraPostgres';
import { AdapSalida_GestoPostgres } from './AdapSalida_GestoPostgres';
import { AdapSalida_UsuarioPostgres } from './AdapSalida_UsuarioPostgres';

/**
 * Adaptador PostgreSQL del puerto PuertoSalidaUnidadDeTrabajo: BEGIN … COMMIT / ROLLBACK
 * sobre una misma conexión, con repositorios que usan esa conexión.
 */
export class AdapSalida_UnidadDeTrabajoPostgres extends PuertoSalidaUnidadDeTrabajo {
  constructor(private readonly pool: Pool) {
    super();
  }

  async ejecutar<T>(trabajo: (repos: RepositoriosTransaccionales) => Promise<T>): Promise<T> {
    const cliente = await this.pool.connect();
    try {
      await cliente.query('BEGIN');
      const resultado = await trabajo({
        usuarios: new AdapSalida_UsuarioPostgres(cliente),
        gestos: new AdapSalida_GestoPostgres(cliente),
        acciones: new AdapSalida_AccionPostgres(cliente),
        bitacora: new AdapSalida_BitacoraPostgres(cliente),
      });
      await cliente.query('COMMIT');
      return resultado;
    } catch (error) {
      await cliente.query('ROLLBACK');
      throw error;
    } finally {
      cliente.release();
    }
  }
}
