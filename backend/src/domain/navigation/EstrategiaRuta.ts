import { Almacen } from '../entities/Almacen';
import { Posicion } from '../shared/Posicion';
import { ResultadoCalculoRuta } from './ResultadoCalculoRuta';

export interface OpcionesCalculoRuta {
  ignorarOcupacion?: boolean;
}

export interface EstrategiaRuta {
  calcular(
    origen: Posicion,
    destino: Posicion,
    almacen: Almacen,
    opciones?: OpcionesCalculoRuta,
  ): ResultadoCalculoRuta;
}
