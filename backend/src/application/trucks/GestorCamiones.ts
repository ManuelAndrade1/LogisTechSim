import { Almacen } from '../../domain/entities/Almacen';
import { Camion } from '../../domain/entities/Camion';
import { Muelle } from '../../domain/entities/Muelle';

export class GestorCamiones {
  private readonly camiones = new Map<string, Camion>();
  private readonly colasPorMuelle = new Map<string, Camion[]>();

  constructor(private readonly almacen: Almacen) {}

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

  public getCamion(id: string): Camion {
    const camion = this.camiones.get(id);
    if (!camion) throw new Error(`No existe el camión ${id}`);
    return camion;
  }

  public getAcoplados(): Camion[] {
    return this.almacen.getMuelles()
      .map(muelle => muelle.getCamion())
      .filter((camion): camion is Camion => camion !== null);
  }

  public desacoplar(camion: Camion, tick: number): void {
    const muelle = this.almacen.getMuelle(camion.muelleId);
    if (muelle.getCamion() !== camion) {
      throw new Error(`El camión ${camion.id} no está acoplado en ${muelle.id}`);
    }
    camion.retirar();
    muelle.desacoplar(camion.id);
    const siguiente = this.colasPorMuelle.get(muelle.id)?.shift();
    if (siguiente) this.acoplar(muelle, siguiente, tick);
  }

  private acoplar(muelle: Muelle, camion: Camion, tick: number): void {
    muelle.acoplar(camion);
    camion.acoplar(tick);
  }
}
