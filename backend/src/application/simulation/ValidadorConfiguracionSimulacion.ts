import { MapaConfigDTO, RobotConfigDTO } from '../contracts/dtos';

export class ValidadorConfiguracionSimulacion {
  public validar(_mapaConfig: MapaConfigDTO, robotsConfig: readonly RobotConfigDTO[]): void {
    if (robotsConfig.length === 0) {
      throw new Error('La simulación requiere al menos un robot');
    }
  }
}
