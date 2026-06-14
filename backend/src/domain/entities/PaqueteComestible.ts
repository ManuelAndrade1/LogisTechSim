import { Paquete } from './Paquete';

export class PaqueteComestible extends Paquete {
  constructor(
    id: string | null,
    idPlanificado: string,
    peso: number,
    private readonly vencimiento: Date | null,
  ) {
    super(id, idPlanificado, peso, 'COMESTIBLE');
  }

  public getVencimiento(): Date | null {
    return this.vencimiento;
  }
}
