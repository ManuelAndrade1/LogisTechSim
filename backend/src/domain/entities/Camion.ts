import type { Orden } from './Orden';
import { EstadoCamion, ManifiestoOrden, TipoCamion } from '../shared/tipos';

export class Camion {
  private estado: EstadoCamion | null = null;
  private tickAcople: number | null = null;
  private ordenesRegistradas = false;
  private ordenes: Orden[] = [];

  constructor(
    public readonly id: string,
    public readonly tipo: TipoCamion,
    public readonly muelleId: string,
    public readonly manifiesto: readonly ManifiestoOrden[],
  ) {
    if (!id) throw new Error('El camión debe tener identificador');
    if (!muelleId) throw new Error(`El camión ${id} debe indicar un muelle`);
  }

  public acoplar(tick: number): void {
    if (this.estado !== null) throw new Error(`El camión ${this.id} ya fue procesado`);
    this.estado = EstadoCamion.ACOPLADO;
    this.tickAcople = tick;
  }

  public puedeRegistrarOrdenes(tick: number): boolean {
    return this.estado === EstadoCamion.ACOPLADO
      && this.tickAcople !== null
      && tick >= this.tickAcople + 1
      && !this.ordenesRegistradas;
  }

  public registrarOrdenes(ordenes: Orden[]): void {
    if (this.ordenesRegistradas) throw new Error(`Las órdenes de ${this.id} ya fueron registradas`);
    this.ordenes = [...ordenes];
    this.ordenesRegistradas = true;
    this.estado = EstadoCamion.TRABAJANDO;
  }

  public getOrdenes(): readonly Orden[] {
    return this.ordenes;
  }

  public estaAcoplado(): boolean {
    return this.estado === EstadoCamion.ACOPLADO || this.estado === EstadoCamion.TRABAJANDO;
  }

  public estaTerminado(): boolean {
    return this.ordenesRegistradas
      && this.ordenes.every(orden => orden.estaCompletada());
  }

  public retirar(): void {
    if (!this.estaTerminado()) throw new Error(`El camión ${this.id} todavía tiene órdenes pendientes`);
    this.estado = EstadoCamion.RETIRADO;
  }
}
