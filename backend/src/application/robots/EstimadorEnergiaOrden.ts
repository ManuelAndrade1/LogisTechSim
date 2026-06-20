import { Almacen } from '../../domain/entities/Almacen';
import { Orden } from '../../domain/entities/Orden';
import { Robot } from '../../domain/entities/Robot';
import { Posicion, distanciaManhattan } from '../../domain/shared/Posicion';
import { FaseTarea } from '../../domain/shared/tipos';
import { EstimadorCostoRuta, EstimadorCostoRutaAStar } from './EstimadorCostoRuta';

export interface EstimadorEnergiaRobotOrden {
  estimar(robot: Robot, orden: Orden, fase: FaseTarea): number;
}

export class EstimadorEnergiaOrden implements EstimadorEnergiaRobotOrden {
  constructor(
    private readonly almacen: Almacen,
    private readonly estimadorCosto: EstimadorCostoRuta = new EstimadorCostoRutaAStar(),
  ) {}

  public estimar(robot: Robot, orden: Orden, fase: FaseTarea): number {
    if (fase === 'HACIA_ORIGEN') {
      return this.costo(robot.getPosicion(), orden.getOrigen())
        + this.costo(orden.getOrigen(), orden.getDestino(), 2)
        + this.energiaHastaBaseMasCercana(orden.getDestino());
    }
    return this.costo(robot.getPosicion(), orden.getDestino(), 2)
      + this.energiaHastaBaseMasCercana(orden.getDestino());
  }

  private costo(origen: Posicion, destino: Posicion, multiplicador = 1): number {
    return this.estimadorCosto.estimarPasos(origen, destino, this.almacen) * multiplicador;
  }

  private energiaHastaBaseMasCercana(desde: Posicion): number {
    const bases = this.almacen.getBases();
    if (bases.length === 0) throw new Error('No existen bases de carga');
    return Math.min(
      ...bases.map(base => distanciaManhattan(desde, base.posicion)),
    );
  }
}
