import {
  Almacen,
  BaseCarga,
  Camion,
  distanciaManhattan,
  EstadoOrden,
  EstadoRobot,
  Estanteria,
  ManifiestoOrden,
  mismaPosicion,
  Muelle,
  Orden,
  Paquete,
  PaqueteComestible,
  PaqueteGeneral,
  Posicion,
  ResultadoActividadRobot,
  Robot,
} from '../domain/model';
import { PlanificadorRutas } from '../domain/navigation';

export class GestorPaquetes {
  public crearDesdeManifiesto(manifiesto: ManifiestoOrden, fisico: boolean): Paquete {
    const id = fisico ? manifiesto.paqueteId : null;
    if (manifiesto.tipoPaquete === 'COMESTIBLE') {
      return new PaqueteComestible(
        id,
        manifiesto.paqueteId,
        manifiesto.peso,
        manifiesto.vencimiento,
      );
    }
    return new PaqueteGeneral(id, manifiesto.paqueteId, manifiesto.peso);
  }

  public crearYGuardar(paquete: Paquete, estanteria: Estanteria): void {
    if (!estanteria.estaVacia()) {
      throw new Error(`La estantería (${estanteria.x},${estanteria.y}) está ocupada`);
    }
    paquete.materializar();
    estanteria.guardar(paquete);
  }

  public retirar(estanteria: Estanteria, paqueteId: string): Paquete {
    return estanteria.retirarPaquete(paqueteId);
  }
}

export class GestorCamiones {
  private readonly camiones = new Map<string, Camion>();
  private readonly colasPorMuelle = new Map<string, Camion[]>();
  private readonly ordenesPorId = new Map<string, Orden>();

  constructor(
    private readonly almacen: Almacen,
    private readonly gestorPaquetes: GestorPaquetes,
  ) {}

  public recibir(camion: Camion, tickAcople: number): void {
    if (this.camiones.has(camion.id)) throw new Error(`Camión duplicado: ${camion.id}`);
    const muelle = this.almacen.getMuelle(camion.muelleId);
    this.camiones.set(camion.id, camion);

    if (!muelle.getCamion()) {
      this.acoplar(muelle, camion, tickAcople);
      return;
    }

    const cola = this.colasPorMuelle.get(muelle.id) ?? [];
    cola.push(camion);
    this.colasPorMuelle.set(muelle.id, cola);
  }

  public registrarManifiestosHabilitados(tick: number): void {
    for (const muelle of this.almacen.getMuelles()) {
      const camion = muelle.getCamion();
      if (!camion?.puedeRegistrarOrdenes(tick)) continue;

      const idsManifiesto = new Set<string>();
      for (const manifiesto of camion.manifiesto) {
        if (idsManifiesto.has(manifiesto.id) || this.ordenesPorId.has(manifiesto.id)) {
          throw new Error(`Orden duplicada: ${manifiesto.id}`);
        }
        idsManifiesto.add(manifiesto.id);
      }

      const ordenes = camion.manifiesto.map(manifiesto => {
        const paquete = this.gestorPaquetes.crearDesdeManifiesto(manifiesto, false);
        return new Orden(manifiesto.id, camion.id, camion.tipo, paquete);
      });
      for (const orden of ordenes) this.ordenesPorId.set(orden.id, orden);
      camion.registrarOrdenes(ordenes);
    }
  }

  public getOrdenes(): Orden[] {
    return [...this.ordenesPorId.values()];
  }

  public getCamion(id: string): Camion {
    const camion = this.camiones.get(id);
    if (!camion) throw new Error(`No existe el camión ${id}`);
    return camion;
  }

  public retirarCompletados(tick: number): void {
    for (const muelle of this.almacen.getMuelles()) {
      const camion = muelle.getCamion();
      if (!camion?.estaTerminado()) continue;

      camion.retirar();
      muelle.desacoplar(camion.id);
      const siguiente = this.colasPorMuelle.get(muelle.id)?.shift();
      if (siguiente) this.acoplar(muelle, siguiente, tick);
    }
  }

  private acoplar(muelle: Muelle, camion: Camion, tick: number): void {
    muelle.acoplar(camion);
    camion.acoplar(tick);
  }
}

export interface PoliticaPriorizacionOrdenes {
  priorizar(ordenes: readonly Orden[]): Orden[];
}

export class PriorizadorOrdenes implements PoliticaPriorizacionOrdenes {
  public priorizar(ordenes: readonly Orden[]): Orden[] {
    return [...ordenes].sort((a, b) => {
      const paqueteA = a.getPaquete();
      const paqueteB = b.getPaquete();

      if (paqueteA.tipo !== paqueteB.tipo) {
        return paqueteA.tipo === 'COMESTIBLE' ? -1 : 1;
      }

      if (paqueteA.tipo === 'COMESTIBLE') {
        const fechaA = paqueteA.getVencimiento()?.getTime() ?? Number.POSITIVE_INFINITY;
        const fechaB = paqueteB.getVencimiento()?.getTime() ?? Number.POSITIVE_INFINITY;
        if (fechaA !== fechaB) return fechaA - fechaB;
      } else if (paqueteA.peso !== paqueteB.peso) {
        return paqueteB.peso - paqueteA.peso;
      }

      return a.id.localeCompare(b.id);
    });
  }
}

export class OrquestadorOrdenes {
  constructor(
    private readonly almacen: Almacen,
    private readonly gestorCamiones: GestorCamiones,
    private readonly priorizador: PoliticaPriorizacionOrdenes,
  ) {}

  public obtenerPendientesPriorizadas(): Orden[] {
    const elegibles = this.gestorCamiones.getOrdenes().filter(orden => {
      if (orden.getEstado() !== EstadoOrden.PENDIENTE || orden.estaAsignada()) return false;
      if (orden.tipoCamion === 'RECEPCION') return true;

      const estanteria = this.almacen.buscarEstanteriaConPaquete(
        orden.getPaquete().idPlanificado,
      );
      if (!estanteria) return false;
      orden.vincularPaqueteFisico(estanteria.getPaquete()!);
      return true;
    });

    return this.priorizador.priorizar(elegibles);
  }

  public obtenerTodasPriorizadas(): Orden[] {
    return this.priorizador.priorizar(this.gestorCamiones.getOrdenes());
  }
}

export class AsignadorOrdenes {
  constructor(private readonly almacen: Almacen) {}

  public asignar(ordenes: readonly Orden[]): void {
    for (const orden of ordenes) {
      const recursos = this.buscarRecursos(orden);
      if (!recursos) continue;

      const robot = this.buscarRobot(recursos.origen, recursos.destino);
      if (!robot) return;

      try {
        this.almacen.reservar(recursos.origen, robot.id);
        this.almacen.reservar(recursos.destino, robot.id);
      } catch {
        this.almacen.liberarReserva(recursos.origen, robot.id);
        this.almacen.liberarReserva(recursos.destino, robot.id);
        continue;
      }

      orden.asignar(robot.id, recursos.origen, recursos.destino);
      robot.asignarOrden(orden);
    }
  }

  private buscarRecursos(orden: Orden): { origen: Posicion; destino: Posicion } | null {
    const camion = this.buscarCamionAcoplado(orden.camionId);
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
    if (!estanteria
      || !estanteria.estaDisponiblePara()
      || !muelle.estaDisponiblePara()) {
      return null;
    }
    return { origen: estanteria.posicion, destino: muelle.posicion };
  }

  private buscarCamionAcoplado(camionId: string): Camion | null {
    return this.almacen.getMuelles()
      .map(muelle => muelle.getCamion())
      .find(camion => camion?.id === camionId && camion.estaAcoplado()) ?? null;
  }

  private buscarRobot(origen: Posicion, destino: Posicion): Robot | null {
    const disponibles = this.almacen.getRobots().filter(robot => robot.estaDisponible());
    const bloqueandoOrigen = disponibles.find(robot =>
      mismaPosicion(robot.getPosicion(), origen));
    if (bloqueandoOrigen) return bloqueandoOrigen;

    const bloqueandoDestino = disponibles.find(robot =>
      mismaPosicion(robot.getPosicion(), destino));
    if (bloqueandoDestino) return bloqueandoDestino;

    return disponibles
      .sort((a, b) =>
        distanciaManhattan(a.getPosicion(), origen)
        - distanciaManhattan(b.getPosicion(), origen)
        || a.id.localeCompare(b.id))[0] ?? null;
  }
}

export class GestorTransferencias {
  constructor(
    private readonly almacen: Almacen,
    private readonly gestorCamiones: GestorCamiones,
    private readonly gestorPaquetes: GestorPaquetes,
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
    const orden = robot.getOrden();
    if (!orden || !mismaPosicion(robot.getPosicion(), orden.getOrigen())) {
      throw new Error(`El robot ${robot.id} no se encuentra en el origen esperado`);
    }

    const origen = this.almacen.getCelda(orden.getOrigen());
    let paquete: Paquete;
    if (orden.tipoCamion === 'RECEPCION') {
      if (!(origen instanceof Muelle)
        || origen.getCamion()?.id !== orden.camionId
        || origen.getReserva() !== robot.id) {
        throw new Error(`Carga de recepción inválida para ${orden.id}`);
      }
      paquete = orden.getPaquete();
    } else {
      if (!(origen instanceof Estanteria) || origen.getReserva() !== robot.id) {
        throw new Error(`Carga de despacho inválida para ${orden.id}`);
      }
      paquete = this.gestorPaquetes.retirar(origen, orden.getPaquete().idPlanificado);
    }

    robot.cargar(paquete);
    this.almacen.liberarReserva(orden.getOrigen(), robot.id);
  }

  private descargar(robot: Robot): void {
    const orden = robot.getOrden();
    const paquete = robot.getCarga();
    if (!orden || !paquete || !mismaPosicion(robot.getPosicion(), orden.getDestino())) {
      throw new Error(`El robot ${robot.id} no se encuentra en el destino esperado`);
    }

    const destino = this.almacen.getCelda(orden.getDestino());
    if (orden.tipoCamion === 'RECEPCION') {
      if (!(destino instanceof Estanteria) || destino.getReserva() !== robot.id) {
        throw new Error(`Descarga de recepción inválida para ${orden.id}`);
      }
      this.gestorPaquetes.crearYGuardar(paquete, destino);
    } else {
      const camion = this.gestorCamiones.getCamion(orden.camionId);
      if (!(destino instanceof Muelle)
        || destino.getCamion()?.id !== camion.id
        || destino.getReserva() !== robot.id) {
        throw new Error(`Descarga de despacho inválida para ${orden.id}`);
      }
    }

    robot.descargar();
    this.almacen.liberarReserva(orden.getDestino(), robot.id);
    orden.completar();
    robot.completarOrden();
  }
}

export class GestorRecarga {
  constructor(private readonly almacen: Almacen) {}

  public intentarAsignarBase(robot: Robot): BaseCarga | null {
    if (robot.getBaseCargaId()) return this.almacen.getBase(robot.getBaseCargaId()!);

    const base = this.almacen.getBases()
      .filter(candidata => candidata.estaDisponiblePara())
      .sort((a, b) =>
        distanciaManhattan(robot.getPosicion(), a.posicion)
        - distanciaManhattan(robot.getPosicion(), b.posicion)
        || a.id.localeCompare(b.id))[0];
    if (!base) return null;

    base.reservar(robot.id);
    robot.iniciarDesvioARecarga(base.id);
    return base;
  }

  public procesar(resultados: readonly ResultadoActividadRobot[]): void {
    for (const resultado of resultados) {
      if (resultado.tipo !== 'EN_RECARGA') continue;
      const robot = resultado.robot;
      robot.recargar(10);
      if (robot.getBateria() < 100) continue;

      const baseId = robot.getBaseCargaId();
      if (!baseId) throw new Error(`El robot ${robot.id} recarga sin una base asignada`);
      this.almacen.getBase(baseId).liberar(robot.id);
      robot.finalizarRecarga();
    }
  }
}

export class OrquestadorRobots {
  constructor(
    private readonly almacen: Almacen,
    private readonly planificador: PlanificadorRutas,
    private readonly gestorRecarga: GestorRecarga,
  ) {}

  public prepararActividades(): void {
    for (const robot of this.almacen.getRobots()) {
      if (robot.getEstado() === EstadoRobot.RECARGANDO) continue;

      if (robot.getEstado() === EstadoRobot.BATERIA_BAJA) {
        this.prepararRecarga(robot);
        continue;
      }

      const orden = robot.getOrden();
      if (!orden || robot.getEstado() !== EstadoRobot.OPERANDO) {
        if (robot.necesitaDespejar()) this.prepararDespeje(robot);
        continue;
      }

      const objetivo = robot.getFase() === 'HACIA_ORIGEN'
        ? orden.getOrigen()
        : orden.getDestino();
      if (mismaPosicion(robot.getPosicion(), objetivo)) {
        if (robot.getFase() !== 'HACIA_ORIGEN'
          || robot.getBateria() >= this.energiaRestanteNecesaria(robot, orden)) {
          continue;
        }
      }

      if (robot.getBateria() < this.energiaRestanteNecesaria(robot, orden)) {
        const base = this.gestorRecarga.intentarAsignarBase(robot);
        if (!base) {
          robot.limpiarRuta();
          continue;
        }
        this.asignarRuta(robot, base.posicion);
        continue;
      }

      if (!robot.tieneRuta()) this.asignarRuta(robot, objetivo);
    }
  }

  public procesarResultados(resultados: readonly ResultadoActividadRobot[]): void {
    for (const resultado of resultados) {
      if (resultado.tipo !== 'MOVIMIENTO_BLOQUEADO') continue;
      const robot = resultado.robot;
      if (robot.registrarBloqueo() < 3) continue;

      robot.cambiarEstrategia();
      if (robot.necesitaDespejar()) {
        this.prepararDespeje(robot, true);
        continue;
      }
      const objetivo = this.objetivoActual(robot);
      if (objetivo) this.asignarRuta(robot, objetivo);
    }
  }

  public asignarRutasPostOrden(robots: readonly Robot[]): void {
    for (const robot of robots) this.prepararDespeje(robot, true);
  }

  private prepararRecarga(robot: Robot): void {
    const base = this.gestorRecarga.intentarAsignarBase(robot);
    if (!base) {
      robot.limpiarRuta();
      return;
    }
    if (mismaPosicion(robot.getPosicion(), base.posicion)) {
      robot.comenzarRecarga();
      return;
    }
    if (!robot.tieneRuta()) this.asignarRuta(robot, base.posicion);
  }

  private prepararDespeje(robot: Robot, forzarRecalculo = false): void {
    if (robot.getEstado() !== EstadoRobot.INACTIVO || !robot.necesitaDespejar()) return;

    const destinoActual = robot.getDestinoDespeje();
    if (destinoActual
      && !forzarRecalculo
      && !this.almacen.estaOcupada(destinoActual, robot.id)
      && robot.tieneRuta()) {
      return;
    }

    const destino = this.almacen.getPasillosLibres(robot.id)
      .sort((a, b) =>
        distanciaManhattan(robot.getPosicion(), a.posicion)
        - distanciaManhattan(robot.getPosicion(), b.posicion)
        || a.x - b.x
        || a.y - b.y)[0];

    if (!destino) {
      robot.limpiarRuta();
      return;
    }

    const ruta = this.planificador.calcular(
      robot.getEstrategia(),
      robot.getPosicion(),
      destino.posicion,
      this.almacen,
      robot.id,
    );
    robot.iniciarDespeje(destino.posicion, ruta);
    if (mismaPosicion(robot.getPosicion(), destino.posicion)) {
      robot.finalizarDespeje();
    }
  }

  private objetivoActual(robot: Robot): Posicion | null {
    if (robot.getEstado() === EstadoRobot.BATERIA_BAJA) {
      const baseId = robot.getBaseCargaId();
      return baseId ? this.almacen.getBase(baseId).posicion : null;
    }
    if (robot.necesitaDespejar()) return robot.getDestinoDespeje();
    const orden = robot.getOrden();
    if (!orden) return null;
    return robot.getFase() === 'HACIA_ORIGEN' ? orden.getOrigen() : orden.getDestino();
  }

  private asignarRuta(robot: Robot, destino: Posicion): void {
    robot.asignarRuta(this.planificador.calcular(
      robot.getEstrategia(),
      robot.getPosicion(),
      destino,
      this.almacen,
      robot.id,
    ));
  }

  private energiaRestanteNecesaria(robot: Robot, orden: Orden): number {
    const bases = this.almacen.getBases();
    const distanciaABase = (desde: Posicion): number =>
      bases.length === 0
        ? 0
        : Math.min(...bases.map(base => distanciaManhattan(desde, base.posicion)));

    if (robot.getFase() === 'HACIA_ORIGEN') {
      return distanciaManhattan(robot.getPosicion(), orden.getOrigen())
        + distanciaManhattan(orden.getOrigen(), orden.getDestino()) * 2
        + distanciaABase(orden.getDestino());
    }

    return distanciaManhattan(robot.getPosicion(), orden.getDestino()) * 2
      + distanciaABase(orden.getDestino());
  }
}
