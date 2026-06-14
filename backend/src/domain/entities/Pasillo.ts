import { Celda } from './Celda';

export class Pasillo extends Celda {
  constructor(x: number, y: number) {
    super(x, y, 'PASILLO');
  }
}
