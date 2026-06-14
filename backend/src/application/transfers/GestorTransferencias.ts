import { Almacen } from '../../domain/entities/Almacen';
import { Estanteria } from '../../domain/entities/Estanteria';
import { Muelle } from '../../domain/entities/Muelle';
import { Paquete } from '../../domain/entities/Paquete';
import { Robot } from '../../domain/entities/Robot';
import { mismaPosicion } from '../../domain/shared/Posicion';
import { GestorPaquetes } from '../packages/GestorPaquetes';
import { ControladorRobots } from '../robots/ControladorRobots';
import { ResultadoActividadRobot } from '../robots/ResultadoActividadRobot';

export class GestorTransferencias {
  constructor(
    private readonly almacen: Almacen,
    private readonly paquetes: GestorPaquetes,
    private readonly controladorRobots: ControladorRobots,
  ) {}

  public procesar(resultados: readonly ResultadoActividadRobot[]): Robot[] {
    const completaron: Robot[] = [];
    for (const resultado of resultados) {
      if (resultado.tipo === 'SOLICITA_CARGA') this.cargar(resultado.robot);
      if (resultado.tipo === 'SOLICITA_DESCARGA') {
        this.descargar(resultado.robot);
        completaron.push(resultado.robot);
      }
    }
    return completaron;
  }

  private cargar(robot: Robot): void {
    const contexto = this.controladorRobots.getContexto(robot);
    const orden = contexto.orden;
    if (!orden || !mismaPosicion(robot.getPosicion(), orden.getOrigen())) {
      throw new Error(`El robot ${robot.id} no se encuentra en el origen esperado`);
    }

    const origen = this.almacen.getCelda(orden.getOrigen());
    let paquete: Paquete;
    if (orden.tipoCamion === 'RECEPCION') {
      if (!(origen instanceof Muelle)
        || origen.getCamion() !== orden.camion
        || origen.getReserva() !== robot.id) {
        throw new Error(`Carga de recepción inválida para ${orden.id}`);
      }
      paquete = orden.getPaquete();
    } else {
      if (!(origen instanceof Estanteria) || origen.getReserva() !== robot.id) {
        throw new Error(`Carga de despacho inválida para ${orden.id}`);
      }
      paquete = this.paquetes.retirar(origen, orden.getPaquete().idPlanificado);
    }

    robot.cargar(paquete);
    this.controladorRobots.registrarCarga(robot);
    this.almacen.liberarReserva(orden.getOrigen(), robot.id);
  }

  private descargar(robot: Robot): void {
    const contexto = this.controladorRobots.getContexto(robot);
    const orden = contexto.orden;
    const paquete = robot.getCarga();
    if (!orden || !paquete || !mismaPosicion(robot.getPosicion(), orden.getDestino())) {
      throw new Error(`El robot ${robot.id} no se encuentra en el destino esperado`);
    }

    const destino = this.almacen.getCelda(orden.getDestino());
    if (orden.tipoCamion === 'RECEPCION') {
      if (!(destino instanceof Estanteria) || destino.getReserva() !== robot.id) {
        throw new Error(`Descarga de recepción inválida para ${orden.id}`);
      }
      this.paquetes.crearYGuardar(paquete, destino);
    } else if (!(destino instanceof Muelle)
      || destino.getCamion() !== orden.camion
      || destino.getReserva() !== robot.id) {
      throw new Error(`Descarga de despacho inválida para ${orden.id}`);
    }

    robot.descargar();
    this.almacen.liberarReserva(orden.getDestino(), robot.id);
    orden.completar();
    this.controladorRobots.completarOrden(robot);
  }
}
