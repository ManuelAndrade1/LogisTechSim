import { GestorCamiones } from './GestorCamiones';

export class RetiradorCamionesCompletos {
  constructor(private readonly camiones: GestorCamiones) {}

  public procesar(tick: number): void {
    for (const camion of this.camiones.getAcoplados()) {
      if (camion.estaTerminado()) this.camiones.desacoplar(camion, tick);
    }
  }
}
