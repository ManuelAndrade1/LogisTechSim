import { Almacen } from '../entities/Almacen';
import { Posicion, mismaPosicion, posicionKey } from '../shared/Posicion';
import { EstrategiaRuta, OpcionesCalculoRuta } from './EstrategiaRuta';
import { ResultadoCalculoRuta } from './ResultadoCalculoRuta';

export class AStar implements EstrategiaRuta {
  public calcular(
    origen: Posicion,
    destino: Posicion,
    almacen: Almacen,
    opciones: OpcionesCalculoRuta = {},
  ): ResultadoCalculoRuta {
    if (mismaPosicion(origen, destino)) return { tipo: 'EN_DESTINO' };

    const abiertos = new Set<string>([posicionKey(origen)]);
    const posiciones = new Map<string, Posicion>([[posicionKey(origen), origen]]);
    const anterior = new Map<string, string>();
    const costo = new Map<string, number>([[posicionKey(origen), 0]]);

    while (abiertos.size > 0) {
      const actualKey = [...abiertos].sort((a, b) => {
        const pa = posiciones.get(a)!;
        const pb = posiciones.get(b)!;
        const fa = (costo.get(a) ?? Infinity) + this.heuristica(pa, destino);
        const fb = (costo.get(b) ?? Infinity) + this.heuristica(pb, destino);
        return fa - fb || a.localeCompare(b);
      })[0];
      const actual = posiciones.get(actualKey)!;

      if (mismaPosicion(actual, destino)) {
        return {
          tipo: 'RUTA',
          pasos: this.reconstruir(actualKey, posicionKey(origen), anterior, posiciones),
        };
      }

      abiertos.delete(actualKey);
      for (const vecino of this.vecinos(actual, almacen)) {
        if (!opciones.ignorarOcupacion
          && almacen.estaOcupada(vecino)
          && !mismaPosicion(vecino, destino)) {
          continue;
        }

        const vecinoKey = posicionKey(vecino);
        const nuevoCosto = (costo.get(actualKey) ?? Infinity) + 1;
        if (nuevoCosto >= (costo.get(vecinoKey) ?? Infinity)) continue;

        posiciones.set(vecinoKey, vecino);
        anterior.set(vecinoKey, actualKey);
        costo.set(vecinoKey, nuevoCosto);
        abiertos.add(vecinoKey);
      }
    }

    return { tipo: 'SIN_CAMINO' };
  }

  private vecinos(posicion: Posicion, almacen: Almacen): Posicion[] {
    return [
      { x: posicion.x + 1, y: posicion.y },
      { x: posicion.x - 1, y: posicion.y },
      { x: posicion.x, y: posicion.y + 1 },
      { x: posicion.x, y: posicion.y - 1 },
    ].filter(vecino => almacen.estaDentro(vecino));
  }

  private heuristica(a: Posicion, b: Posicion): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  private reconstruir(
    destinoKey: string,
    origenKey: string,
    anterior: Map<string, string>,
    posiciones: Map<string, Posicion>,
  ): Posicion[] {
    const ruta: Posicion[] = [];
    let actualKey = destinoKey;
    while (actualKey !== origenKey) {
      ruta.unshift({ ...posiciones.get(actualKey)! });
      const previo = anterior.get(actualKey);
      if (!previo) throw new Error('La ruta calculada quedó incompleta');
      actualKey = previo;
    }
    return ruta;
  }
}
