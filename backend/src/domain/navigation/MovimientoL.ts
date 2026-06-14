import { Almacen } from '../entities/Almacen';
import { Posicion, mismaPosicion } from '../shared/Posicion';
import { EstrategiaRuta } from './EstrategiaRuta';
import { ResultadoCalculoRuta } from './ResultadoCalculoRuta';

export class MovimientoL implements EstrategiaRuta {
  public calcular(
    origen: Posicion,
    destino: Posicion,
    _almacen?: Almacen,
  ): ResultadoCalculoRuta {
    if (mismaPosicion(origen, destino)) return { tipo: 'EN_DESTINO' };

    const pasos: Posicion[] = [];
    let { x, y } = origen;
    while (x !== destino.x) {
      x += destino.x > x ? 1 : -1;
      pasos.push({ x, y });
    }
    while (y !== destino.y) {
      y += destino.y > y ? 1 : -1;
      pasos.push({ x, y });
    }
    return { tipo: 'RUTA', pasos };
  }
}
