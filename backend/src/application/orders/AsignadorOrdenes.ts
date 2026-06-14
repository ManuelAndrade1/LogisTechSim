import { Almacen } from '../../domain/entities/Almacen';
import { Camion } from '../../domain/entities/Camion';
import { ConflictoReservaError } from '../../domain/entities/CeldaReservable';
import { Orden } from '../../domain/entities/Orden';
import { Robot } from '../../domain/entities/Robot';
import { RegistroRobots } from '../../domain/registries/RegistroRobots';
import { Posicion, distanciaManhattan, mismaPosicion } from '../../domain/shared/Posicion';
import { ControladorRobots } from '../robots/ControladorRobots';

export class AsignadorOrdenes {
  constructor(
    private readonly almacen: Almacen,
    private readonly robots: RegistroRobots,
    private readonly controladorRobots: ControladorRobots,
  ) {}

  public asignar(ordenes: readonly Orden[]): void {
    for (const orden of ordenes) {
      const recursos = this.buscarRecursos(orden);
      if (!recursos) continue;
      const robot = this.buscarRobot(recursos.origen, recursos.destino);
      if (!robot) return;
      this.asignarTransaccionalmente(orden, robot, recursos.origen, recursos.destino);
    }
  }

  private asignarTransaccionalmente(
    orden: Orden,
    robot: Robot,
    origen: Posicion,
    destino: Posicion,
  ): void {
    let origenReservado = false;
    let destinoReservado = false;
    let ordenAsignada = false;
    try {
      this.almacen.reservar(origen, robot.id);
      origenReservado = true;
      this.almacen.reservar(destino, robot.id);
      destinoReservado = true;
      orden.asignar(robot.id, origen, destino);
      ordenAsignada = true;
      this.controladorRobots.asignarOrden(robot, orden);
    } catch (error) {
      this.controladorRobots.cancelarAsignacion(robot, orden);
      if (ordenAsignada) orden.cancelarAsignacion(robot.id);
      if (destinoReservado) this.almacen.liberarReserva(destino, robot.id);
      if (origenReservado) this.almacen.liberarReserva(origen, robot.id);
      if (error instanceof ConflictoReservaError) return;
      throw error;
    }
  }

  private buscarRecursos(orden: Orden): { origen: Posicion; destino: Posicion } | null {
    const camion = this.buscarCamionAcoplado(orden);
    if (!camion) return null;
    const muelle = this.almacen.getMuelle(camion.muelleId);

    if (orden.tipoCamion === 'RECEPCION') {
      if (!muelle.estaDisponiblePara()) return null;
      const estanteria = this.almacen.getEstanterias()
        .filter(candidata => candidata.estaVacia() && candidata.estaDisponiblePara())
        .sort((a, b) =>
          distanciaManhattan(muelle.posicion, a.posicion)
          - distanciaManhattan(muelle.posicion, b.posicion)
          || a.x - b.x
          || a.y - b.y)[0];
      return estanteria ? { origen: muelle.posicion, destino: estanteria.posicion } : null;
    }

    const estanteria = this.almacen.buscarEstanteriaConPaquete(
      orden.getPaquete().idPlanificado,
    );
    if (!estanteria || !estanteria.estaDisponiblePara() || !muelle.estaDisponiblePara()) {
      return null;
    }
    return { origen: estanteria.posicion, destino: muelle.posicion };
  }

  private buscarCamionAcoplado(orden: Orden): Camion | null {
    return orden.camion.estaAcoplado() ? orden.camion : null;
  }

  private buscarRobot(origen: Posicion, destino: Posicion): Robot | null {
    const disponibles = this.robots.getTodos()
      .filter(robot => this.controladorRobots.estaDisponible(robot));
    const bloqueandoOrigen = disponibles.find(robot =>
      mismaPosicion(robot.getPosicion(), origen));
    if (bloqueandoOrigen) return bloqueandoOrigen;
    const bloqueandoDestino = disponibles.find(robot =>
      mismaPosicion(robot.getPosicion(), destino));
    if (bloqueandoDestino) return bloqueandoDestino;
    return disponibles.sort((a, b) =>
      distanciaManhattan(a.getPosicion(), origen)
      - distanciaManhattan(b.getPosicion(), origen)
      || a.id.localeCompare(b.id))[0] ?? null;
  }
}
