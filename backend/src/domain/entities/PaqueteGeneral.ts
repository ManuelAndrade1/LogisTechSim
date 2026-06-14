import { Paquete } from './Paquete';

export class PaqueteGeneral extends Paquete {
  constructor(id: string | null, idPlanificado: string, peso: number) {
    super(id, idPlanificado, peso, 'GENERAL');
  }

  public getVencimiento(): Date | null {
    return null;
  }
}
