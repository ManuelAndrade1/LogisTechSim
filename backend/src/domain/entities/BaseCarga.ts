import { Celda } from './Celda';

export class BaseCarga extends Celda {
  constructor(x: number, y: number, public readonly id: string) {
    super(x, y, 'BASE_CARGA');
    if (!id) throw new Error('La base de carga debe tener identificador');
  }
}
