import { Almacen } from '../../domain/entities/Almacen';
import { AStar } from '../../domain/navigation/AStar';
import { OpcionesCalculoRuta } from '../../domain/navigation/EstrategiaRuta';
import { Posicion } from '../../domain/shared/Posicion';

export type OpcionesEstimacionCostoRuta = OpcionesCalculoRuta;

export interface EstimadorCostoRuta {
  estimarPasos(
    origen: Posicion,
    destino: Posicion,
    almacen: Almacen,
    opciones?: OpcionesEstimacionCostoRuta,
  ): number;
}

export class EstimadorCostoRutaAStar implements EstimadorCostoRuta {
  private readonly estrategia = new AStar();

  public estimarPasos(
    origen: Posicion,
    destino: Posicion,
    almacen: Almacen,
    opciones?: OpcionesEstimacionCostoRuta,
  ): number {
    const resultado = this.estrategia.calcular(origen, destino, almacen, opciones);
    if (resultado.tipo === 'EN_DESTINO') return 0;
    if (resultado.tipo === 'SIN_CAMINO') return Number.POSITIVE_INFINITY;
    return resultado.pasos.length;
  }
}
