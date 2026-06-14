import { TipoPaquete } from '../shared/tipos';

export abstract class Paquete {
  private id: string | null;

  protected constructor(
    id: string | null,
    public readonly idPlanificado: string,
    public readonly peso: number,
    public readonly tipo: TipoPaquete,
  ) {
    if (!idPlanificado) throw new Error('El paquete debe tener un identificador planificado');
    if (!Number.isFinite(peso) || peso < 0) throw new Error('El peso del paquete es inválido');
    this.id = id;
  }

  public getId(): string | null {
    return this.id;
  }

  public existeFisicamente(): boolean {
    return this.id !== null;
  }

  public materializar(): void {
    if (this.id !== null) throw new Error(`El paquete ${this.id} ya fue materializado`);
    this.id = this.idPlanificado;
  }

  public abstract getVencimiento(): Date | null;
}
