import { Almacen } from '../../domain/entities/Almacen';
import { Robot } from '../../domain/entities/Robot';
import { distanciaManhattan } from '../../domain/shared/Posicion';
import { EstadoRobot } from '../../domain/shared/tipos';
import { AsignadorRutas } from './AsignadorRutas';
import { ControladorRobots } from './ControladorRobots';

export class GestorDespeje {
  constructor(
    private readonly almacen: Almacen,
    private readonly controlador: ControladorRobots,
    private readonly rutas: AsignadorRutas,
  ) {}

  public preparar(robot: Robot, forzarRecalculo = false): void {
    const contexto = this.controlador.getContexto(robot);
    if (robot.getEstado() !== EstadoRobot.INACTIVO || !contexto.requiereDespeje) return;

    const destinoActual = contexto.destinoDespeje;
    if (destinoActual
      && !forzarRecalculo
      && !this.almacen.estaOcupada(destinoActual)
      && robot.tieneRuta()) {
      return;
    }

    const destino = this.almacen.getPasillosLibres().sort((a, b) =>
      distanciaManhattan(robot.getPosicion(), a.posicion)
      - distanciaManhattan(robot.getPosicion(), b.posicion)
      || a.x - b.x
      || a.y - b.y)[0];
    if (!destino) {
      robot.limpiarRuta();
      return;
    }

    this.controlador.iniciarDespeje(robot, destino.posicion);
    const resultado = this.rutas.asignar(robot, destino.posicion);
    if (resultado.tipo === 'EN_DESTINO') {
      this.controlador.finalizarDespejeSiCorresponde(robot);
    }
  }
}
