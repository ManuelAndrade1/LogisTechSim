import { Orden } from '../../domain/entities/Orden';
import { Robot } from '../../domain/entities/Robot';
import { RegistroRobots } from '../../domain/registries/RegistroRobots';
import { Posicion, mismaPosicion } from '../../domain/shared/Posicion';
import { EstadoRobot } from '../../domain/shared/tipos';
import { ContextoRobot, crearContextoRobot } from './ContextoRobot';

export class ControladorRobots {
  private readonly contextos = new Map<string, ContextoRobot>();

  constructor(private readonly robots: RegistroRobots) {
    for (const robot of robots.getTodos()) this.contextos.set(robot.id, crearContextoRobot());
  }

  public getContexto(robot: Robot): Readonly<ContextoRobot> {
    return this.contextoMutable(robot);
  }

  public estaDisponible(robot: Robot): boolean {
    const contexto = this.contextoMutable(robot);
    return robot.getEstado() === EstadoRobot.INACTIVO && contexto.orden === null;
  }

  public asignarOrden(robot: Robot, orden: Orden): void {
    if (!this.estaDisponible(robot)) throw new Error(`El robot ${robot.id} no está disponible`);
    const contexto = this.contextoMutable(robot);
    this.cancelarDespeje(robot);
    contexto.orden = orden;
    contexto.fase = 'HACIA_ORIGEN';
    robot.cambiarEstado(EstadoRobot.OPERANDO);
    robot.limpiarRuta();
  }

  public cancelarAsignacion(robot: Robot, orden: Orden): void {
    const contexto = this.contextoMutable(robot);
    if (contexto.orden !== orden) return;
    contexto.orden = null;
    contexto.fase = null;
    robot.cambiarEstado(EstadoRobot.INACTIVO);
    robot.limpiarRuta();
  }

  public registrarCarga(robot: Robot): void {
    const contexto = this.contextoMutable(robot);
    if (!contexto.orden || contexto.fase !== 'HACIA_ORIGEN') {
      throw new Error(`El robot ${robot.id} no está listo para cargar`);
    }
    contexto.fase = 'HACIA_DESTINO';
  }

  public completarOrden(robot: Robot): void {
    const contexto = this.contextoMutable(robot);
    if (!contexto.orden) throw new Error(`El robot ${robot.id} no tiene una orden`);
    contexto.orden = null;
    contexto.fase = null;
    contexto.requiereDespeje = true;
    contexto.destinoDespeje = null;
    robot.cambiarEstado(EstadoRobot.INACTIVO);
    robot.limpiarRuta();
    robot.reiniciarBloqueos();
  }

  public solicitarDespeje(robot: Robot): void {
    const contexto = this.contextoMutable(robot);
    if (contexto.orden || robot.getEstado() !== EstadoRobot.INACTIVO) {
      throw new Error(`El robot ${robot.id} no puede solicitar un despeje`);
    }
    contexto.requiereDespeje = true;
    contexto.destinoDespeje = null;
  }

  public iniciarDespeje(robot: Robot, destino: Posicion): void {
    const contexto = this.contextoMutable(robot);
    if (contexto.orden || robot.getEstado() !== EstadoRobot.INACTIVO) {
      throw new Error(`El robot ${robot.id} no puede iniciar un despeje`);
    }
    contexto.requiereDespeje = true;
    contexto.destinoDespeje = { ...destino };
  }

  public cancelarDespeje(robot: Robot): void {
    const contexto = this.contextoMutable(robot);
    contexto.requiereDespeje = false;
    contexto.destinoDespeje = null;
    robot.limpiarRuta();
    robot.reiniciarBloqueos();
  }

  public finalizarDespejeSiCorresponde(robot: Robot): void {
    const contexto = this.contextoMutable(robot);
    if (contexto.destinoDespeje
      && mismaPosicion(robot.getPosicion(), contexto.destinoDespeje)) {
      this.cancelarDespeje(robot);
    }
  }

  public iniciarDesvioARecarga(robot: Robot, baseId: string): void {
    const contexto = this.contextoMutable(robot);
    contexto.baseCargaId = baseId;
    robot.cambiarEstado(EstadoRobot.BATERIA_BAJA);
    robot.limpiarRuta();
  }

  public comenzarRecarga(robot: Robot): void {
    const contexto = this.contextoMutable(robot);
    if (!contexto.baseCargaId) {
      throw new Error(`El robot ${robot.id} no tiene una base asignada`);
    }
    robot.cambiarEstado(EstadoRobot.RECARGANDO);
    robot.reiniciarBloqueos();
  }

  public finalizarRecarga(robot: Robot): void {
    if (robot.getBateria() < 100) {
      throw new Error(`El robot ${robot.id} todavía no completó la recarga`);
    }
    const contexto = this.contextoMutable(robot);
    contexto.baseCargaId = null;
    robot.cambiarEstado(contexto.orden ? EstadoRobot.OPERANDO : EstadoRobot.INACTIVO);
    if (!contexto.orden) this.solicitarDespeje(robot);
  }

  public getRobots(): Robot[] {
    return this.robots.getTodos();
  }

  private contextoMutable(robot: Robot): ContextoRobot {
    const contexto = this.contextos.get(robot.id);
    if (!contexto) throw new Error(`El robot ${robot.id} no está controlado`);
    return contexto;
  }
}
