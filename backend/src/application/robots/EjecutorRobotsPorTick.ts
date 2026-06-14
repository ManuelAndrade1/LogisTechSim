import { Almacen } from '../../domain/entities/Almacen';
import { Robot } from '../../domain/entities/Robot';
import { mismaPosicion } from '../../domain/shared/Posicion';
import { EstadoRobot } from '../../domain/shared/tipos';
import { ControladorRobots } from './ControladorRobots';
import { ResultadoActividadRobot } from './ResultadoActividadRobot';

export class EjecutorRobotsPorTick {
  constructor(
    private readonly almacen: Almacen,
    private readonly controlador: ControladorRobots,
  ) {}

  public ejecutar(): ResultadoActividadRobot[] {
    return this.controlador.getRobots().map(robot => this.ejecutarRobot(robot));
  }

  private ejecutarRobot(robot: Robot): ResultadoActividadRobot {
    if (robot.getEstado() === EstadoRobot.RECARGANDO) {
      return { tipo: 'EN_RECARGA', robot };
    }

    const contexto = this.controlador.getContexto(robot);
    if (contexto.orden && robot.getEstado() === EstadoRobot.OPERANDO) {
      const objetivo = contexto.fase === 'HACIA_ORIGEN'
        ? contexto.orden.getOrigen()
        : contexto.orden.getDestino();
      if (mismaPosicion(robot.getPosicion(), objetivo)) {
        if (contexto.fase === 'HACIA_ORIGEN' && !robot.getCarga()) {
          return { tipo: 'SOLICITA_CARGA', robot };
        }
        if (contexto.fase === 'HACIA_DESTINO' && robot.getCarga()) {
          return { tipo: 'SOLICITA_DESCARGA', robot };
        }
      }
    }

    const resultado = robot.ejecutarSiguienteMovimiento({
      intentarMover: (desde, hasta) => this.almacen.moverOcupacion(desde, hasta),
    });
    if (resultado.tipo === 'MOVIMIENTO_REALIZADO') {
      this.controlador.finalizarDespejeSiCorresponde(robot);
      return { ...resultado, robot };
    }
    if (resultado.tipo === 'MOVIMIENTO_BLOQUEADO') {
      return { ...resultado, robot };
    }
    return { tipo: 'SIN_ACTIVIDAD', robot };
  }
}
