import { CalculadorRutas } from '../../domain/navigation/CalculadorRutas';
import { Almacen } from '../../domain/entities/Almacen';
import { BaseCarga } from '../../domain/entities/BaseCarga';
import { RegistroRobots } from '../../domain/registries/RegistroRobots';
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
import { EstimadorCostoRuta, EstimadorCostoRutaAStar } from '../robots/EstimadorCostoRuta';
import { GestorDespeje } from '../robots/GestorDespeje';
import { OrquestadorRobots } from '../robots/OrquestadorRobots';
import { PoliticaBateria } from '../robots/PoliticaBateria';
import { ResolutorCesionPuntual } from '../robots/ResolutorBloqueos';
import { GestorTransferencias } from '../transfers/GestorTransferencias';
import { GestorCamiones } from '../trucks/GestorCamiones';
import { ProcesadorManifiestos } from '../trucks/ProcesadorManifiestos';
import { RetiradorCamionesCompletos } from '../trucks/RetiradorCamionesCompletos';
import { ContextoSimulacion } from './ContextoSimulacion';
import { ValidadorConfiguracionSimulacion } from './ValidadorConfiguracionSimulacion';

export class InicializadorSimulacion {
  constructor(
    private readonly fabrica = new FabricaDominio(),
    private readonly validador = new ValidadorConfiguracionSimulacion(),
  ) {}

  public inicializar(
    mapaConfig: MapaConfigDTO,
    robotsConfig: readonly RobotConfigDTO[],
  ): ContextoSimulacion {
    this.validador.validar(mapaConfig, robotsConfig);
    const almacen = this.fabrica.crearAlmacen(mapaConfig);
    const robots = new RegistroRobots(almacen);
    for (const robot of this.fabrica.crearRobots(robotsConfig)) robots.registrar(robot);
    const estimadorCosto = new EstimadorCostoRutaAStar();
    this.validarBasesAlcanzables(almacen, almacen.getBases(), robots, estimadorCosto);

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
      estimadorCosto,
    );
    const asignadorRutas = new AsignadorRutas(almacen, new CalculadorRutas());
    const gestorRecarga = new GestorRecarga(almacen, controladorRobots, estimadorCosto);
    const gestorDespeje = new GestorDespeje(
      almacen,
      controladorRobots,
      asignadorRutas,
      estimadorCosto,
    );
    const orquestadorRobots = new OrquestadorRobots(
      almacen,
      controladorRobots,
      asignadorRutas,
      gestorRecarga,
      new PoliticaBateria(almacen, undefined, estimadorCosto),
      gestorDespeje,
      new ResolutorCesionPuntual(almacen, asignadorRutas),
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
    almacen: Almacen,
    bases: readonly BaseCarga[],
    robots: RegistroRobots,
    estimadorCosto: EstimadorCostoRuta,
  ): void {
    for (const robot of robots.getTodos()) {
      const costo = Math.min(
        ...bases.map(base =>
          estimadorCosto.estimarPasos(robot.getPosicion(), base.posicion, almacen)),
      );
      if (robot.getBateria() < costo) {
        throw new Error(
          `El robot ${robot.id} no tiene batería inicial para alcanzar una base de carga`,
        );
      }
    }
  }
}
