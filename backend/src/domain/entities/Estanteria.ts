import { Paquete } from './Paquete';
import { CeldaReservable } from './CeldaReservable';

export class Estanteria extends CeldaReservable {
  private paquete: Paquete | null = null;

  constructor(x: number, y: number) {
    super(x, y, 'ESTANTERIA');
  }

  public estaVacia(): boolean {
    return this.paquete === null;
  }

  public getPaquete(): Paquete | null {
    return this.paquete;
  }

  public guardar(paquete: Paquete): void {
    if (!this.estaVacia()) throw new Error(`La estantería (${this.x},${this.y}) está ocupada`);
    if (!paquete.existeFisicamente()) throw new Error('No se puede guardar un paquete preliminar');
    this.paquete = paquete;
  }

  public retirarPaquete(esperadoId: string): Paquete {
    if (!this.paquete || this.paquete.getId() !== esperadoId) {
      throw new Error(`La estantería (${this.x},${this.y}) no contiene ${esperadoId}`);
    }
    const paquete = this.paquete;
    this.paquete = null;
    return paquete;
  }
}
