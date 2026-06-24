import { Almacen } from '../entities/Almacen';
import { Posicion, mismaPosicion } from '../shared/Posicion';
import { EstrategiaRuta, OpcionesCalculoRuta } from './EstrategiaRuta';
import { ResultadoCalculoRuta } from './ResultadoCalculoRuta';

export class MovimientoL implements EstrategiaRuta {
  public calcular(
    origen: Posicion,
    destino: Posicion,
    _almacen?: Almacen,
    _opciones?: OpcionesCalculoRuta,
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
