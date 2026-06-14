import { Posicion } from '../shared/Posicion';

export type TipoCelda = 'PASILLO' | 'ESTANTERIA' | 'MUELLE' | 'BASE_CARGA';

export abstract class Celda {
  private ocupada = false;

  protected constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly tipo: TipoCelda,
  ) {}

  public get posicion(): Posicion {
    return { x: this.x, y: this.y };
  }

  public estaOcupada(): boolean {
    return this.ocupada;
  }

  public ocupar(): void {
    if (this.ocupada) throw new Error(`La celda (${this.x},${this.y}) está ocupada`);
    this.ocupada = true;
  }

  public liberar(): void {
    if (!this.ocupada) throw new Error(`La celda (${this.x},${this.y}) ya está libre`);
    this.ocupada = false;
  }
}
