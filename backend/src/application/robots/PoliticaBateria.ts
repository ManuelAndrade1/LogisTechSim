import { Almacen } from '../../domain/entities/Almacen';
import { Orden } from '../../domain/entities/Orden';
import { Robot } from '../../domain/entities/Robot';
import { Posicion, distanciaManhattan } from '../../domain/shared/Posicion';
import { FaseTarea } from '../../domain/shared/tipos';

export class PoliticaBateria {
  constructor(private readonly almacen: Almacen) {}

  public energiaHastaBaseMasCercana(desde: Posicion): number {
    const bases = this.almacen.getBases();
    if (bases.length === 0) throw new Error('No existen bases de carga');
    return Math.min(...bases.map(base => distanciaManhattan(desde, base.posicion)));
  }

  public debeRecargarInactivo(robot: Robot): boolean {
    return robot.getBateria() <= this.energiaHastaBaseMasCercana(robot.getPosicion());
  }

  public debeRecargarParaOrden(robot: Robot, orden: Orden, fase: FaseTarea): boolean {
    const energia = this.energiaRestanteOrden(robot, orden, fase);
    if (energia >= 100 && robot.getBateria() >= 100) {
      throw new Error(`La orden ${orden.id} supera la autonomía máxima del robot ${robot.id}`);
    }
    return robot.getBateria() <= energia;
  }

  private energiaRestanteOrden(robot: Robot, orden: Orden, fase: FaseTarea): number {
    if (fase === 'HACIA_ORIGEN') {
      return distanciaManhattan(robot.getPosicion(), orden.getOrigen())
        + distanciaManhattan(orden.getOrigen(), orden.getDestino()) * 2
        + this.energiaHastaBaseMasCercana(orden.getDestino());
    }
    return distanciaManhattan(robot.getPosicion(), orden.getDestino()) * 2
      + this.energiaHastaBaseMasCercana(orden.getDestino());
  }
}
