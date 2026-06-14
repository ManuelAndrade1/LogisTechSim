import {
  CamionDTO,
  EstadoAlmacenDTO,
  MapaConfigDTO,
  RobotConfigDTO,
} from './contracts/dtos';
import { ContextoSimulacion } from './simulation/ContextoSimulacion';
import { InicializadorSimulacion } from './simulation/InicializadorSimulacion';
import { MapeadorEstadoAlmacen } from './simulation/MapeadorEstadoAlmacen';
import { ProcesadorPasoSimulacion } from './simulation/ProcesadorPasoSimulacion';

export { EstadoAlmacenDTO } from './contracts/dtos';

export class ControladorAlmacen {
  private tickActual = 0;
  private contexto: ContextoSimulacion | null = null;

  constructor(
    private readonly inicializador = new InicializadorSimulacion(),
    private readonly procesadorPaso = new ProcesadorPasoSimulacion(),
    private readonly mapeadorEstado = new MapeadorEstadoAlmacen(),
  ) {}

  public inicializar(mapaConfig: MapaConfigDTO, robotsConfig: RobotConfigDTO[]): void {
    this.contexto = this.inicializador.inicializar(mapaConfig, robotsConfig);
    this.tickActual = 0;
  }

  public procesarPaso(): void {
    const contexto = this.obtenerContexto();
    this.tickActual += 1;
    this.procesadorPaso.procesar(contexto, this.tickActual);
  }

  public onCamionLlega(camionDTO: CamionDTO): void {
    const camion = this.inicializador.crearCamion(camionDTO);
    this.obtenerContexto().gestorCamiones.recibir(camion, this.tickActual + 1);
  }

  public obtenerEstado(): EstadoAlmacenDTO {
    return this.mapeadorEstado.mapear(this.obtenerContexto());
  }

  private obtenerContexto(): ContextoSimulacion {
    if (!this.contexto) {
      throw new Error('El controlador debe inicializarse antes de utilizarse');
    }
    return this.contexto;
  }
}
