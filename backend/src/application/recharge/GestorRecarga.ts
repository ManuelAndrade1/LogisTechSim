import { Almacen } from '../../domain/entities/Almacen';
import { BaseCarga } from '../../domain/entities/BaseCarga';
import { Robot } from '../../domain/entities/Robot';
import { ControladorRobots } from '../robots/ControladorRobots';
import { EstimadorCostoRuta, EstimadorCostoRutaAStar } from '../robots/EstimadorCostoRuta';
import { ResultadoActividadRobot } from '../robots/ResultadoActividadRobot';

export class GestorRecarga {
  constructor(
    private readonly almacen: Almacen,
    private readonly controladorRobots: ControladorRobots,
    private readonly estimadorCosto: EstimadorCostoRuta = new EstimadorCostoRutaAStar(),
  ) {}

  public asignarBase(robot: Robot): BaseCarga {
    const asignada = this.controladorRobots.getContexto(robot).baseCargaId;
    if (asignada) return this.almacen.getBase(asignada);

    const base = this.almacen.getBases()
      .map(candidata => ({
        base: candidata,
        costo: this.estimadorCosto.estimarPasos(
          robot.getPosicion(),
          candidata.posicion,
          this.almacen,
        ),
      }))
      .filter(candidata => Number.isFinite(candidata.costo))
      .sort((a, b) => a.costo - b.costo || a.base.id.localeCompare(b.base.id))[0]?.base;
    if (!base) throw new Error('No existe una base de carga alcanzable para asignar');
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
