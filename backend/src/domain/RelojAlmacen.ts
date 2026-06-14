import {
  ContextoTickRobot,
  ObservadorTickRobot,
  ResultadoActividadRobot,
} from './model';

export class RelojAlmacen {
  private readonly observadores = new Map<string, ObservadorTickRobot>();

  public registrar(observador: ObservadorTickRobot): void {
    if (this.observadores.has(observador.id)) {
      throw new Error(`El observer ${observador.id} ya está registrado`);
    }
    this.observadores.set(observador.id, observador);
  }

  public notificar(contexto: ContextoTickRobot): ResultadoActividadRobot[] {
    return [...this.observadores.values()]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(observador => observador.ejecutarTick(contexto));
  }
}
