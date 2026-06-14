import { Almacen } from '../../domain/entities/Almacen';
import { Orden } from '../../domain/entities/Orden';
import { EstadoOrden } from '../../domain/shared/tipos';
import { PoliticaPriorizacionOrdenes } from './PriorizadorOrdenes';
import { RegistroOrdenes } from './RegistroOrdenes';

export class OrquestadorOrdenes {
  constructor(
    private readonly almacen: Almacen,
    private readonly ordenes: RegistroOrdenes,
    private readonly priorizador: PoliticaPriorizacionOrdenes,
  ) {}

  public obtenerPendientesPriorizadas(): Orden[] {
    const elegibles = this.ordenes.getTodas().filter(orden => {
      if (orden.getEstado() !== EstadoOrden.PENDIENTE || orden.estaAsignada()) return false;
      if (orden.tipoCamion === 'RECEPCION') return true;

      const estanteria = this.almacen.buscarEstanteriaConPaquete(
        orden.getPaquete().idPlanificado,
      );
      if (!estanteria) return false;
      orden.vincularPaqueteFisico(estanteria.getPaquete()!);
      return true;
    });
    return this.priorizador.priorizar(elegibles);
  }

  public obtenerTodasPriorizadas(): Orden[] {
    return this.priorizador.priorizar(this.ordenes.getTodas());
  }
}
