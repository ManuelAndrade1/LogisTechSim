import { Celda, TipoCelda } from './Celda';

export class ConflictoReservaError extends Error {}

export abstract class CeldaReservable extends Celda {
  private reservadaPor: string | null = null;

  protected constructor(x: number, y: number, tipo: TipoCelda) {
    super(x, y, tipo);
  }

  public estaDisponiblePara(robotId?: string): boolean {
    return this.reservadaPor === null || this.reservadaPor === robotId;
  }

  public reservar(robotId: string): void {
    if (!this.estaDisponiblePara(robotId)) {
      throw new ConflictoReservaError(`La celda (${this.x},${this.y}) ya está reservada`);
    }
    this.reservadaPor = robotId;
  }

  public liberarReserva(robotId: string): void {
    if (this.reservadaPor === robotId) this.reservadaPor = null;
  }

  public getReserva(): string | null {
    return this.reservadaPor;
  }
}
