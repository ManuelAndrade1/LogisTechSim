import {
  Almacen,
  AlmacenBuilder,
  BaseCarga,
  Camion,
  Estanteria,
  ManifiestoOrden,
  Muelle,
  Robot,
  TipoPaquete,
} from '../domain/model';
import {
  CamionDTO,
  MapaConfigDTO,
  OrdenDTO,
  RobotConfigDTO,
} from './contracts/dtos';

export class FabricaDominio {
  public crearAlmacen(
    mapaConfig: MapaConfigDTO,
  ): Almacen {
    return new AlmacenBuilder()
      .conDimensiones(mapaConfig.dimensiones.width, mapaConfig.dimensiones.height)
      .conEstanterias(mapaConfig.estanterias.map(
        config => new Estanteria(config.x, config.y),
      ))
      .conMuelles(mapaConfig.muelles.map(
        config => new Muelle(config.x, config.y, config.id),
      ))
      .conBasesCarga(mapaConfig.basesCarga.map(
        config => new BaseCarga(config.x, config.y, config.id),
      ))
      .construir();
  }

  public crearRobots(configuraciones: readonly RobotConfigDTO[]): Robot[] {
    return configuraciones.map(
      config => new Robot(config.id, config.x, config.y, config.bateria),
    );
  }

  public crearCamion(dto: CamionDTO): Camion {
    if (!['RECEPCION', 'DESPACHO'].includes(dto.tipo)) {
      throw new Error(`Tipo de camión inválido: ${dto.tipo}`);
    }
    const manifiesto = dto.ordenes.map(orden => this.crearManifiesto(dto, orden));
    return new Camion(dto.id, dto.tipo, dto.muelleId, manifiesto);
  }

  private crearManifiesto(camion: CamionDTO, orden: OrdenDTO): ManifiestoOrden {
    if (orden.camionId !== camion.id) {
      throw new Error(`La orden ${orden.id} no pertenece al camión ${camion.id}`);
    }
    const tipoPaquete = orden.tipoPaquete.toUpperCase() as TipoPaquete;
    if (!['COMESTIBLE', 'GENERAL'].includes(tipoPaquete)) {
      throw new Error(`Tipo de paquete inválido en ${orden.id}: ${orden.tipoPaquete}`);
    }

    let vencimiento: Date | null = null;
    if (orden.vencimiento) {
      vencimiento = new Date(orden.vencimiento);
      if (Number.isNaN(vencimiento.getTime())) {
        throw new Error(`Fecha de vencimiento inválida en ${orden.id}`);
      }
    }

    return {
      id: orden.id,
      paqueteId: orden.paqueteId,
      tipoPaquete,
      peso: orden.peso,
      vencimiento,
    };
  }
}
