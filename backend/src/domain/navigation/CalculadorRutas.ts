import { Almacen } from '../entities/Almacen';
import { Posicion } from '../shared/Posicion';
import { EstrategiaNavegacion } from '../shared/tipos';
import { AStar } from './AStar';
import { EstrategiaRuta, OpcionesCalculoRuta } from './EstrategiaRuta';
import { MovimientoL } from './MovimientoL';
import { ResultadoCalculoRuta } from './ResultadoCalculoRuta';

export class CalculadorRutas {
  private readonly estrategias = new Map<EstrategiaNavegacion, EstrategiaRuta>([
    [EstrategiaNavegacion.MOVIMIENTO_L, new MovimientoL()],
    [EstrategiaNavegacion.A_STAR, new AStar()],
  ]);

  public calcular(
    estrategia: EstrategiaNavegacion,
    origen: Posicion,
    destino: Posicion,
    almacen: Almacen,
    opciones?: OpcionesCalculoRuta,
  ): ResultadoCalculoRuta {
    const implementacion = this.estrategias.get(estrategia);
    if (!implementacion) throw new Error(`Estrategia de navegación no soportada: ${estrategia}`);
    return implementacion.calcular(origen, destino, almacen, opciones);
  }
}
