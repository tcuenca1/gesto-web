import { RepositoriosTransaccionales, PuertoSalidaUnidadDeTrabajo } from '../../../aplicacion/puerto/salida/PuertoSalidaUnidadDeTrabajo';
import { ContextoOrm, orm } from '../../base_dato/ConexionSequelize';
import { AdapSalida_AccionSequelize } from './AdapSalida_AccionSequelize';
import { AdapSalida_BitacoraSequelize } from './AdapSalida_BitacoraSequelize';
import { AdapSalida_GestoSequelize } from './AdapSalida_GestoSequelize';
import { AdapSalida_UsuarioSequelize } from './AdapSalida_UsuarioSequelize';

/**
 * Adaptador del puerto PuertoSalidaUnidadDeTrabajo con transacciones de Sequelize:
 * sequelize.transaction() hace COMMIT si el trabajo termina y ROLLBACK si lanza
 * un error, y los repositorios reciben esa transacción.
 */
export class AdapSalida_UnidadDeTrabajoSequelize extends PuertoSalidaUnidadDeTrabajo {
  constructor(private readonly ctx: ContextoOrm) {
    super();
  }

  async ejecutar<T>(trabajo: (repos: RepositoriosTransaccionales) => Promise<T>): Promise<T> {
    return orm(() =>
      this.ctx.modelos.sequelize.transaction(async (transaccion) => {
        const ctx: ContextoOrm = { modelos: this.ctx.modelos, transaccion };
        return trabajo({
          usuarios: new AdapSalida_UsuarioSequelize(ctx),
          gestos: new AdapSalida_GestoSequelize(ctx),
          acciones: new AdapSalida_AccionSequelize(ctx),
          bitacora: new AdapSalida_BitacoraSequelize(ctx),
        });
      }),
    );
  }
}
