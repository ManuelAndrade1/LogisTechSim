import { Almacen } from '../../domain/entities/Almacen';
import { Robot } from '../../domain/entities/Robot';
import { mismaPosicion } from '../../domain/shared/Posicion';
import { EstadoRobot } from '../../domain/shared/tipos';
import { GestorRecarga } from '../recharge/GestorRecarga';
import { AsignadorRutas } from './AsignadorRutas';
import { ControladorRobots } from './ControladorRobots';
import { GestorDespeje } from './GestorDespeje';
import { PoliticaBateria } from './PoliticaBateria';
import { ResultadoActividadRobot } from './ResultadoActividadRobot';

export class OrquestadorRobots {
  constructor(
    private readonly almacen: Almacen,
    private readonly controlador: ControladorRobots,
    private readonly rutas: AsignadorRutas,
    private readonly recarga: GestorRecarga,
    private readonly bateria: PoliticaBateria,
    private readonly despeje: GestorDespeje,
  ) {}

  public prepararActividades(): void {
    for (const robot of this.controlador.getRobots()) {
      if (robot.getEstado() === EstadoRobot.RECARGANDO) continue;
      if (robot.getEstado() === EstadoRobot.BATERIA_BAJA) {
        this.prepararRecarga(robot);
        continue;
      }

      const contexto = this.controlador.getContexto(robot);
      if (contexto.orden && robot.getEstado() === EstadoRobot.OPERANDO) {
        this.prepararOrden(robot);
        continue;
      }

      if (this.bateria.debeRecargarInactivo(robot)) {
        this.prepararRecarga(robot);
        continue;
      }
      if (contexto.requiereDespeje) this.despeje.preparar(robot);
    }
  }

  public procesarResultados(resultados: readonly ResultadoActividadRobot[]): void {
    for (const resultado of resultados) {
      if (resultado.tipo !== 'MOVIMIENTO_BLOQUEADO') continue;
      const robot = resultado.robot;
      if (robot.registrarBloqueo() < 3) continue;

      robot.cambiarEstrategia();
      const contexto = this.controlador.getContexto(robot);
      if (contexto.requiereDespeje && robot.getEstado() === EstadoRobot.INACTIVO) {
        this.despeje.preparar(robot, true);
        continue;
      }
      const objetivo = this.objetivoActual(robot);
      if (objetivo) this.rutas.asignar(robot, objetivo);
    }
  }

  public asignarRutasPostOrden(robots: readonly Robot[]): void {
    for (const robot of robots) this.despeje.preparar(robot, true);
  }

  private prepararOrden(robot: Robot): void {
    const contexto = this.controlador.getContexto(robot);
    const orden = contexto.orden!;
    const fase = contexto.fase!;
    const objetivo = fase === 'HACIA_ORIGEN' ? orden.getOrigen() : orden.getDestino();

    if (mismaPosicion(robot.getPosicion(), objetivo)) {
      if (fase === 'HACIA_DESTINO') return;
      if (!this.bateria.debeRecargarParaOrden(robot, orden, fase)) return;
    }

    if (this.bateria.debeRecargarParaOrden(robot, orden, fase)) {
      this.prepararRecarga(robot);
      return;
    }
    if (!robot.tieneRuta()) this.rutas.asignar(robot, objetivo);
  }

  private prepararRecarga(robot: Robot): void {
    const base = this.recarga.asignarBase(robot);
    if (mismaPosicion(robot.getPosicion(), base.posicion)) {
      this.controlador.comenzarRecarga(robot);
      return;
    }
    if (!robot.tieneRuta()) {
      const resultado = this.rutas.asignar(robot, base.posicion);
      if (resultado.tipo === 'RUTA') {
        const costo = robot.getCarga() ? 2 : 1;
        if (resultado.pasos.length * costo > robot.getBateria()) {
          robot.limpiarRuta();
          throw new Error(`El robot ${robot.id} no puede alcanzar la base ${base.id}`);
        }
      }
    }
  }

  private objetivoActual(robot: Robot) {
    const contexto = this.controlador.getContexto(robot);
    if (robot.getEstado() === EstadoRobot.BATERIA_BAJA) {
      return contexto.baseCargaId
        ? this.almacen.getBase(contexto.baseCargaId).posicion
        : null;
    }
    if (contexto.requiereDespeje) return contexto.destinoDespeje;
    if (!contexto.orden || !contexto.fase) return null;
    return contexto.fase === 'HACIA_ORIGEN'
      ? contexto.orden.getOrigen()
      : contexto.orden.getDestino();
  }
}
