import { Almacen } from '../../domain/entities/Almacen';
import { BaseCarga } from '../../domain/entities/BaseCarga';
import { Robot } from '../../domain/entities/Robot';
import { distanciaManhattan } from '../../domain/shared/Posicion';
import { ControladorRobots } from '../robots/ControladorRobots';
import { ResultadoActividadRobot } from '../robots/ResultadoActividadRobot';

export class GestorRecarga {
  constructor(
    private readonly almacen: Almacen,
    private readonly controladorRobots: ControladorRobots,
  ) {}

  public asignarBase(robot: Robot): BaseCarga {
    const asignada = this.controladorRobots.getContexto(robot).baseCargaId;
    if (asignada) return this.almacen.getBase(asignada);

    const base = this.almacen.getBases().sort((a, b) =>
      distanciaManhattan(robot.getPosicion(), a.posicion)
      - distanciaManhattan(robot.getPosicion(), b.posicion)
      || a.id.localeCompare(b.id))[0];
    if (!base) throw new Error('No existe una base de carga para asignar');
    this.controladorRobots.iniciarDesvioARecarga(robot, base.id);
    return base;
  }

  public procesar(resultados: readonly ResultadoActividadRobot[]): void {
    for (const resultado of resultados) {
      if (resultado.tipo !== 'EN_RECARGA') continue;
      const robot = resultado.robot;
      robot.recargar(10);
      if (robot.getBateria() >= 100) this.controladorRobots.finalizarRecarga(robot);
    }
  }
}
