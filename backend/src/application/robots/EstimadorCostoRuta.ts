import { Almacen } from '../../domain/entities/Almacen';
import { AStar } from '../../domain/navigation/AStar';
import { Posicion } from '../../domain/shared/Posicion';

export interface EstimadorCostoRuta {
  estimarPasos(origen: Posicion, destino: Posicion, almacen: Almacen): number;
}

export class EstimadorCostoRutaAStar implements EstimadorCostoRuta {
  private readonly estrategia = new AStar();

  public estimarPasos(origen: Posicion, destino: Posicion, almacen: Almacen): number {
    const resultado = this.estrategia.calcular(origen, destino, almacen);
    if (resultado.tipo === 'EN_DESTINO') return 0;
    if (resultado.tipo === 'SIN_CAMINO') return Number.POSITIVE_INFINITY;
    return resultado.pasos.length;
  }
}
