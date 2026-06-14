import { Almacen, Camion, ContextoTickRobot } from '../domain/model';
import { PlanificadorRutas } from '../domain/navigation';
import { RelojAlmacen } from '../domain/RelojAlmacen';
import { CamionDTO, MapaConfigDTO, RobotConfigDTO } from '../infrastructure/dtos';
import { FabricaDominio } from './FabricaDominio';
import {
  AsignadorOrdenes,
  GestorCamiones,
  GestorPaquetes,
  GestorRecarga,
  GestorTransferencias,
  OrquestadorOrdenes,
  OrquestadorRobots,
  PriorizadorOrdenes,
} from './services';

export interface EstadoAlmacenDTO {
  dimensiones: { width: number; height: number };
  robots: Array<{
    id: string;
    x: number;
    y: number;
    estado: string;
    carga: boolean;
    bateria: number;
    ordenId: string | null;
    paqueteId: string | null;
  }>;
  ordenes: Array<{
    id: string;
    camionId: string;
    tipoCamion: 'RECEPCION' | 'DESPACHO';
    estado: 'PENDIENTE' | 'COMPLETADA';
    robotId: string | null;
    paqueteId: string;
    tipoPaquete: 'COMESTIBLE' | 'GENERAL';
    peso: number;
    vencimiento: string | null;
  }>;
  camiones: Array<{
    x: number;
    y: number;
    tipo: 'RECEPCION' | 'DESPACHO';
  }>;
  estanterias: Array<{
    x: number;
    y: number;
    paquetes: Array<{
      id: string | null;
      tipo: string;
      peso: number;
      vencimiento: string | null;
    }>;
  }>;
  basesCarga: Array<{ x: number; y: number }>;
}

/**
 * Fachada y raíz de composición del dominio del almacén.
 * Mantiene el orden del caso de uso por tick y delega cada decisión especializada.
 */
export class ControladorAlmacen {
  private tickActual = 0;
  private almacen: Almacen | null = null;
  private reloj: RelojAlmacen | null = null;
  private fabrica: FabricaDominio = new FabricaDominio();
  private gestorCamiones: GestorCamiones | null = null;
  private orquestadorOrdenes: OrquestadorOrdenes | null = null;
  private asignadorOrdenes: AsignadorOrdenes | null = null;
  private orquestadorRobots: OrquestadorRobots | null = null;
  private gestorTransferencias: GestorTransferencias | null = null;
  private gestorRecarga: GestorRecarga | null = null;

  public inicializar(mapaConfig: MapaConfigDTO, robotsConfig: RobotConfigDTO[]): void {
    const almacen = this.fabrica.crearAlmacen(mapaConfig, robotsConfig);
    const reloj = new RelojAlmacen();
    const gestorPaquetes = new GestorPaquetes();
    const gestorCamiones = new GestorCamiones(almacen, gestorPaquetes);
    const gestorRecarga = new GestorRecarga(almacen);

    for (const robot of almacen.getRobots()) reloj.registrar(robot);

    this.tickActual = 0;
    this.almacen = almacen;
    this.reloj = reloj;
    this.gestorCamiones = gestorCamiones;
    this.orquestadorOrdenes = new OrquestadorOrdenes(
      almacen,
      gestorCamiones,
      new PriorizadorOrdenes(),
    );
    this.asignadorOrdenes = new AsignadorOrdenes(almacen);
    this.orquestadorRobots = new OrquestadorRobots(
      almacen,
      new PlanificadorRutas(),
      gestorRecarga,
    );
    this.gestorTransferencias = new GestorTransferencias(
      almacen,
      gestorCamiones,
      gestorPaquetes,
    );
    this.gestorRecarga = gestorRecarga;
  }

  public procesarPaso(): void {
    const contexto = this.obtenerContexto();
    this.tickActual += 1;

    contexto.gestorCamiones.registrarManifiestosHabilitados(this.tickActual);
    const ordenes = contexto.orquestadorOrdenes.obtenerPendientesPriorizadas();
    contexto.asignadorOrdenes.asignar(ordenes);
    contexto.orquestadorRobots.prepararActividades();

    const contextoRobot: ContextoTickRobot = {
      puedeOcupar: (posicion, robotId) =>
        contexto.almacen.estaDentro(posicion)
        && !contexto.almacen.estaOcupada(posicion, robotId),
    };
    const resultados = contexto.reloj.notificar(contextoRobot);

    contexto.orquestadorRobots.procesarResultados(resultados);
    const robotsCompletados = contexto.gestorTransferencias.procesar(resultados);
    contexto.orquestadorRobots.asignarRutasPostOrden(robotsCompletados);
    contexto.gestorRecarga.procesar(resultados);
    contexto.gestorCamiones.retirarCompletados(this.tickActual);
  }

  public onCamionLlega(camionDTO: CamionDTO): void {
    const contexto = this.obtenerContexto();
    const camion: Camion = this.fabrica.crearCamion(camionDTO);

    // El entorno notifica antes de procesar el tick de llegada.
    contexto.gestorCamiones.recibir(camion, this.tickActual + 1);
  }

  public obtenerEstado(): EstadoAlmacenDTO {
    const { almacen, orquestadorOrdenes } = this.obtenerContexto();
    return {
      dimensiones: { width: almacen.width, height: almacen.height },
      robots: almacen.getRobots().map(robot => ({
        id: robot.id,
        ...robot.getPosicion(),
        estado: robot.getEstado(),
        carga: robot.getCarga() !== null,
        bateria: robot.getBateria(),
        ordenId: robot.getOrden()?.id ?? null,
        paqueteId: robot.getCarga()?.idPlanificado ?? null,
      })),
      ordenes: orquestadorOrdenes.obtenerTodasPriorizadas().map(orden => {
        const paquete = orden.getPaquete();
        return {
          id: orden.id,
          camionId: orden.camionId,
          tipoCamion: orden.tipoCamion,
          estado: orden.getEstado(),
          robotId: orden.getRobotId(),
          paqueteId: paquete.idPlanificado,
          tipoPaquete: paquete.tipo,
          peso: paquete.peso,
          vencimiento: paquete.getVencimiento()?.toISOString() ?? null,
        };
      }),
      camiones: almacen.getMuelles().flatMap(muelle => {
        const camion = muelle.getCamion();
        return camion
          ? [{ x: muelle.x, y: muelle.y, tipo: camion.tipo }]
          : [];
      }),
      estanterias: almacen.getEstanterias().map(estanteria => {
        const paquete = estanteria.getPaquete();
        return {
          x: estanteria.x,
          y: estanteria.y,
          paquetes: paquete
            ? [{
              id: paquete.getId(),
              tipo: paquete.tipo,
              peso: paquete.peso,
              vencimiento: paquete.getVencimiento()?.toISOString() ?? null,
            }]
            : [],
        };
      }),
      basesCarga: almacen.getBases().map(base => ({ x: base.x, y: base.y })),
    };
  }

  private obtenerContexto(): {
    almacen: Almacen;
    reloj: RelojAlmacen;
    gestorCamiones: GestorCamiones;
    orquestadorOrdenes: OrquestadorOrdenes;
    asignadorOrdenes: AsignadorOrdenes;
    orquestadorRobots: OrquestadorRobots;
    gestorTransferencias: GestorTransferencias;
    gestorRecarga: GestorRecarga;
  } {
    if (!this.almacen
      || !this.reloj
      || !this.gestorCamiones
      || !this.orquestadorOrdenes
      || !this.asignadorOrdenes
      || !this.orquestadorRobots
      || !this.gestorTransferencias
      || !this.gestorRecarga) {
      throw new Error('El controlador debe inicializarse antes de utilizarse');
    }
    return {
      almacen: this.almacen,
      reloj: this.reloj,
      gestorCamiones: this.gestorCamiones,
      orquestadorOrdenes: this.orquestadorOrdenes,
      asignadorOrdenes: this.asignadorOrdenes,
      orquestadorRobots: this.orquestadorRobots,
      gestorTransferencias: this.gestorTransferencias,
      gestorRecarga: this.gestorRecarga,
    };
  }
}
