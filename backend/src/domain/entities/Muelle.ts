import { Camion } from './Camion';
import { CeldaReservable } from './CeldaReservable';

export class Muelle extends CeldaReservable {
  private camion: Camion | null = null;

  constructor(x: number, y: number, public readonly id: string) {
    super(x, y, 'MUELLE');
    if (!id) throw new Error('El muelle debe tener identificador');
  }

  public getCamion(): Camion | null {
    return this.camion;
  }

  public acoplar(camion: Camion): void {
    if (this.camion) throw new Error(`El muelle ${this.id} está ocupado`);
    this.camion = camion;
  }

  public desacoplar(camionId: string): Camion {
    if (!this.camion || this.camion.id !== camionId) {
      throw new Error(`El camión ${camionId} no está acoplado en ${this.id}`);
    }
    const camion = this.camion;
    this.camion = null;
    return camion;
  }
}
