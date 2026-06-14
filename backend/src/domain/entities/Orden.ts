import type { Camion } from './Camion';
import { Paquete } from './Paquete';
import { Posicion } from '../shared/Posicion';
import { EstadoOrden } from '../shared/tipos';

export class Orden {
  private estado = EstadoOrden.PENDIENTE;
  private robotId: string | null = null;
  private origen: Posicion | null = null;
  private destino: Posicion | null = null;

  constructor(
    public readonly id: string,
    public readonly camion: Camion,
    private paquete: Paquete,
  ) {
    if (!id) throw new Error('La orden debe tener identificador');
  }

  public get camionId(): string {
    return this.camion.id;
  }

  public get tipoCamion() {
    return this.camion.tipo;
  }

  public getEstado(): EstadoOrden {
    return this.estado;
  }

  public estaCompletada(): boolean {
    return this.estado === EstadoOrden.COMPLETADA;
  }

  public getPaquete(): Paquete {
    return this.paquete;
  }

  public vincularPaqueteFisico(paquete: Paquete): void {
    if (this.tipoCamion !== 'DESPACHO') {
      throw new Error('Solo una orden de despacho puede vincular un paquete existente');
    }
    if (!paquete.existeFisicamente()) throw new Error('El paquete vinculado debe existir físicamente');
    if (paquete.idPlanificado !== this.paquete.idPlanificado) {
      throw new Error('El paquete físico no corresponde a la orden');
    }
    this.paquete = paquete;
  }

  public estaAsignada(): boolean {
    return this.robotId !== null;
  }

  public getRobotId(): string | null {
    return this.robotId;
  }

  public getOrigen(): Posicion {
    if (!this.origen) throw new Error(`La orden ${this.id} todavía no tiene origen`);
    return { ...this.origen };
  }

  public getDestino(): Posicion {
    if (!this.destino) throw new Error(`La orden ${this.id} todavía no tiene destino`);
    return { ...this.destino };
  }

  public asignar(robotId: string, origen: Posicion, destino: Posicion): void {
    if (this.estaCompletada()) throw new Error('No se puede asignar una orden completada');
    if (this.robotId !== null) throw new Error(`La orden ${this.id} ya está asignada`);
    this.robotId = robotId;
    this.origen = { ...origen };
    this.destino = { ...destino };
  }

  public cancelarAsignacion(robotId: string): void {
    if (this.robotId !== robotId || this.estaCompletada()) return;
    this.robotId = null;
    this.origen = null;
    this.destino = null;
  }

  public completar(): void {
    if (!this.robotId) throw new Error(`La orden ${this.id} no está asignada`);
    this.estado = EstadoOrden.COMPLETADA;
  }
}
