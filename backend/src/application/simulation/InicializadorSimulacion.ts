import { CalculadorRutas } from '../../domain/navigation/CalculadorRutas';
import { BaseCarga } from '../../domain/entities/BaseCarga';
import { RegistroRobots } from '../../domain/registries/RegistroRobots';
import { distanciaManhattan } from '../../domain/shared/Posicion';
import { CamionDTO, MapaConfigDTO, RobotConfigDTO } from '../contracts/dtos';
import { FabricaDominio } from '../FabricaDominio';
import { AsignadorOrdenes } from '../orders/AsignadorOrdenes';
import { OrquestadorOrdenes } from '../orders/OrquestadorOrdenes';
import { PriorizadorOrdenes } from '../orders/PriorizadorOrdenes';
import { RegistroOrdenes } from '../orders/RegistroOrdenes';
import { GestorPaquetes } from '../packages/GestorPaquetes';
import { GestorRecarga } from '../recharge/GestorRecarga';
import { AsignadorRutas } from '../robots/AsignadorRutas';
import { ControladorRobots } from '../robots/ControladorRobots';
import { EjecutorRobotsPorTick } from '../robots/EjecutorRobotsPorTick';
import { GestorDespeje } from '../robots/GestorDespeje';
import { OrquestadorRobots } from '../robots/OrquestadorRobots';
import { PoliticaBateria } from '../robots/PoliticaBateria';
import { GestorTransferencias } from '../transfers/GestorTransferencias';
import { GestorCamiones } from '../trucks/GestorCamiones';
import { ProcesadorManifiestos } from '../trucks/ProcesadorManifiestos';
import { RetiradorCamionesCompletos } from '../trucks/RetiradorCamionesCompletos';
import { ContextoSimulacion } from './ContextoSimulacion';

export class InicializadorSimulacion {
  constructor(private readonly fabrica = new FabricaDominio()) {}

  public inicializar(
    mapaConfig: MapaConfigDTO,
    robotsConfig: readonly RobotConfigDTO[],
  ): ContextoSimulacion {
    const almacen = this.fabrica.crearAlmacen(mapaConfig);
    const robots = new RegistroRobots(almacen);
    for (const robot of this.fabrica.crearRobots(robotsConfig)) robots.registrar(robot);
    this.validarBasesAlcanzables(almacen.getBases(), robots);

    const controladorRobots = new ControladorRobots(robots);
    for (const robot of robots.getTodos()) {
      if (almacen.getCelda(robot.getPosicion()) instanceof BaseCarga) {
        controladorRobots.solicitarDespeje(robot);
      }
    }
    const gestorPaquetes = new GestorPaquetes();
    const gestorCamiones = new GestorCamiones(almacen);
    const registroOrdenes = new RegistroOrdenes();
    const procesadorManifiestos = new ProcesadorManifiestos(
      gestorCamiones,
      gestorPaquetes,
      registroOrdenes,
    );
    const orquestadorOrdenes = new OrquestadorOrdenes(
      almacen,
      registroOrdenes,
      new PriorizadorOrdenes(),
    );
    const asignadorOrdenes = new AsignadorOrdenes(
      almacen,
      robots,
      controladorRobots,
    );
    const asignadorRutas = new AsignadorRutas(almacen, new CalculadorRutas());
    const gestorRecarga = new GestorRecarga(almacen, controladorRobots);
    const gestorDespeje = new GestorDespeje(
      almacen,
      controladorRobots,
      asignadorRutas,
    );
    const orquestadorRobots = new OrquestadorRobots(
      almacen,
      controladorRobots,
      asignadorRutas,
      gestorRecarga,
      new PoliticaBateria(almacen),
      gestorDespeje,
    );

    return {
      almacen,
      robots,
      controladorRobots,
      gestorCamiones,
      procesadorManifiestos,
      registroOrdenes,
      orquestadorOrdenes,
      asignadorOrdenes,
      orquestadorRobots,
      ejecutorRobots: new EjecutorRobotsPorTick(almacen, controladorRobots),
      gestorTransferencias: new GestorTransferencias(
        almacen,
        gestorPaquetes,
        controladorRobots,
      ),
      gestorRecarga,
      retiradorCamiones: new RetiradorCamionesCompletos(gestorCamiones),
    };
  }

  public crearCamion(dto: CamionDTO) {
    return this.fabrica.crearCamion(dto);
  }

  private validarBasesAlcanzables(
    bases: readonly BaseCarga[],
    robots: RegistroRobots,
  ): void {
    for (const robot of robots.getTodos()) {
      const distancia = Math.min(
        ...bases.map(base => distanciaManhattan(robot.getPosicion(), base.posicion)),
      );
      if (robot.getBateria() < distancia) {
        throw new Error(
          `El robot ${robot.id} no tiene batería inicial para alcanzar una base de carga`,
        );
      }
    }
  }
}
