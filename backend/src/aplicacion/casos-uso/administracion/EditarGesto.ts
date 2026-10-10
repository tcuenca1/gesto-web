import { ErrorNoEncontrado } from '../../../dominio/compartido/errores';
import { GestoDTO } from '../../puertos/entrada/dtos';
import { EditarGestoPuerto, EntradaEditarGesto } from '../../puertos/entrada/administracion';
import { UnidadDeTrabajo } from '../../puertos/salida/UnidadDeTrabajo';
import { gestoADto } from '../comun';

/**
 * RF-18 · El administrador activa o desactiva un gesto y edita su nombre,
 * descripción y confianza mínima. El cambio y su registro en la bitácora
 * (RF-22) se guardan juntos: o se guardan los dos o ninguno.
 */
export class EditarGesto implements EditarGestoPuerto {
  constructor(private readonly unidad: UnidadDeTrabajo) {}

  ejecutar(entrada: EntradaEditarGesto): Promise<GestoDTO> {
    return this.unidad.ejecutar(async ({ gestos, bitacora }) => {
      const gesto = await gestos.buscarPorId(entrada.idGesto);
      if (!gesto) throw new ErrorNoEncontrado('El gesto no existe');

      const antes = gesto.aDatos();
      gesto.editar(entrada.cambios);
      await gestos.actualizar(gesto);

      await bitacora.registrar({
        idUsuario: entrada.idAdministrador,
        tablaAfectada: 'gestos',
        operacion: 'UPDATE',
        detalle: { antes, despues: gesto.aDatos() },
      });
      return gestoADto(gesto);
    });
  }
}
