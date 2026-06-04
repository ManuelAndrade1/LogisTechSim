import path from 'path';
import { TickObserver, TickSubject } from '../domain/interfaces/TickObserver';
import { ControladorAlmacen } from '../application/ControladorAlmacen';
import { CSVLoader } from './factories/CSVLoader';
import { CamionDTO, MapaConfigDTO, RobotConfigDTO } from './dtos';

/**
 * Entorno de Simulación.
 * Representa el mundo exterior interactuando con el Controlador del Almacén.
 * Es responsable de gestionar el tiempo (ticks), inyectar camiones según la
 * configuración (mock del mundo físico) y notificar eventos.
 */
export class SimuladorEntorno implements TickSubject {
  private tickActual: number = 0;
  private observers: TickObserver[] = [];
  private simActual: string = 'sim1';
  private camionesPendientes: CamionDTO[] = [];
  
  public controlador: ControladorAlmacen;
  private readonly dataBasePath: string;

  constructor(dataBasePath: string) {
    this.dataBasePath = dataBasePath;
    this.controlador = new ControladorAlmacen();
  }

  public init(simName: string = 'sim1'): void {
    this.simActual = simName;
    const dataPath = path.join(this.dataBasePath, simName);

    // Cargar datos crudos desde CSV
    const rawAlmacen = CSVLoader.loadAlmacen(path.join(dataPath, 'almacen.csv'));
    const rawCamiones = CSVLoader.loadCamiones(path.join(dataPath, 'camiones.csv'));
    const rawOrdenes = CSVLoader.loadOrdenes(path.join(dataPath, 'ordenes.csv'));

    const mapaConfig: MapaConfigDTO = {
      dimensiones: rawAlmacen.dimensiones,
      estanterias: rawAlmacen.estanterias,
      muelles: rawAlmacen.muelles,
      basesCarga: rawAlmacen.basesCarga
    };

    const robotsConfig: RobotConfigDTO[] = rawAlmacen.robots;

    // Agrupar órdenes dentro del DTO del camión
    this.camionesPendientes = rawCamiones.map(c => ({
      id: c.id,
      tipo: c.tipo,
      muelleId: c.muelleId,
      tickLlegada: c.tickLlegada,
      ordenes: rawOrdenes.filter(o => o.camionId === c.id)
    }));

    // Inicializar el sistema del almacén (caja negra) con puras primitivas
    this.controlador.inicializar(mapaConfig, robotsConfig);

    this.tickActual = 0;
    console.log(`[Entorno] Simulación '${simName}' cargada. Reloj en tick 0.`);
  }

  public reset(simName?: string): void {
    this.init(simName ?? this.simActual);
  }

  /**
   * Avanza el reloj global de la simulación.
   */
  public avanzarTick(): void {
    this.tickActual++;
    console.log(`[Entorno] ---------------- Reloj: Tick ${this.tickActual} ----------------`);

    // 1. Mundo físico: Inyectar camiones que llegan en este tick (según mock/CSV)
    const llegadas = this.camionesPendientes.filter(c => c.tickLlegada === this.tickActual);
    for (const camionDTO of llegadas) {
      console.log(`[Entorno] Un camión físico (${camionDTO.id}) ha llegado. Notificando al controlador...`);
      // Invocar Caso de Uso: Acoplar Camión con DTO
      this.controlador.onCamionLlega(camionDTO);
      this.camionesPendientes = this.camionesPendientes.filter(c => c !== camionDTO);
    }

    // 2. Avanzar el paso lógico del controlador del almacén (Sincronizado)
    this.controlador.procesarPaso();

    // 3. Notificar a observadores (por ejemplo, UI, logs)
    this.notifyObservers();
  }

  public getTickActual(): number {
    return this.tickActual;
  }

  public getEstadoActual(): object {
    return {
      tick: this.tickActual,
      ...this.controlador.obtenerEstado()
    };
  }

  public addObserver(observer: TickObserver): void {
    this.observers.push(observer);
  }

  public removeObserver(observer: TickObserver): void {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  public notifyObservers(): void {
    for (const observer of this.observers) {
      observer.onTick(this.tickActual);
    }
  }
}
