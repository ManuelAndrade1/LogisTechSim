import { Orden } from '../../domain/entities/Orden';
import { GestorPaquetes } from '../packages/GestorPaquetes';
import { RegistroOrdenes } from '../orders/RegistroOrdenes';
import { GestorCamiones } from './GestorCamiones';

export class ProcesadorManifiestos {
  constructor(
    private readonly camiones: GestorCamiones,
    private readonly paquetes: GestorPaquetes,
    private readonly ordenes: RegistroOrdenes,
  ) {}

  public procesarHabilitados(tick: number): void {
    for (const camion of this.camiones.getAcoplados()) {
      if (!camion.puedeRegistrarOrdenes(tick)) continue;
      const nuevasOrdenes = camion.manifiesto.map(manifiesto => new Orden(
        manifiesto.id,
        camion,
        this.paquetes.crearDesdeManifiesto(manifiesto, false),
      ));
      this.ordenes.registrarTodas(nuevasOrdenes);
      camion.registrarOrdenes(nuevasOrdenes);
    }
  }
}
