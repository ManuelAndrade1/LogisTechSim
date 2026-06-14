import { Posicion } from '../shared/Posicion';

export type ResultadoCalculoRuta =
  | { tipo: 'EN_DESTINO' }
  | { tipo: 'RUTA'; pasos: Posicion[] }
  | { tipo: 'SIN_CAMINO' };
