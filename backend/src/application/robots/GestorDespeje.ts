import { Almacen } from '../../domain/entities/Almacen';
import { Robot } from '../../domain/entities/Robot';
import { EstadoRobot } from '../../domain/shared/tipos';
import { AsignadorRutas } from './AsignadorRutas';
import { ControladorRobots } from './ControladorRobots';
import { EstimadorCostoRuta, EstimadorCostoRutaAStar } from './EstimadorCostoRuta';

export class GestorDespeje {
  constructor(
    private readonly almacen: Almacen,
    private readonly controlador: ControladorRobots,
    private readonly rutas: AsignadorRutas,
    private readonly estimadorCosto: EstimadorCostoRuta = new EstimadorCostoRutaAStar(),
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

    const destino = this.almacen.getPasillosLibres()
      .map(candidata => ({
        pasillo: candidata,
        costo: this.estimadorCosto.estimarPasos(
          robot.getPosicion(),
          candidata.posicion,
          this.almacen,
        ),
      }))
      .filter(candidata => Number.isFinite(candidata.costo))
      .sort((a, b) =>
        a.costo - b.costo
        || a.pasillo.x - b.pasillo.x
        || a.pasillo.y - b.pasillo.y)[0]?.pasillo;
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
