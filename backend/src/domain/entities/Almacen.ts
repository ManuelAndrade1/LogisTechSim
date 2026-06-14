import { BaseCarga } from './BaseCarga';
import { Celda } from './Celda';
import { CeldaReservable } from './CeldaReservable';
import { Estanteria } from './Estanteria';
import { Muelle } from './Muelle';
import { Pasillo } from './Pasillo';
import { Posicion, posicionKey } from '../shared/Posicion';

export interface ConfiguracionAlmacen {
  width: number;
  height: number;
  estanterias: readonly Estanteria[];
  muelles: readonly Muelle[];
  bases: readonly BaseCarga[];
}

export class Almacen {
  private readonly celdas = new Map<string, Celda>();
  private readonly muelles = new Map<string, Muelle>();
  private readonly bases = new Map<string, BaseCarga>();
  private readonly estanterias: Estanteria[] = [];

  private constructor(
    public readonly width: number,
    public readonly height: number,
  ) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        this.celdas.set(posicionKey({ x, y }), new Pasillo(x, y));
      }
    }
  }

  public static construir(configuracion: ConfiguracionAlmacen): Almacen {
    const { width, height, estanterias, muelles, bases } = configuracion;
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
      throw new Error('Las dimensiones del almacén son inválidas');
    }
    if (bases.length === 0) {
      throw new Error('El almacén debe definir al menos una base de carga');
    }

    const almacen = new Almacen(width, height);
    for (const estanteria of estanterias) almacen.agregarEstanteria(estanteria);
    for (const muelle of muelles) almacen.agregarMuelle(muelle);
    for (const base of bases) almacen.agregarBase(base);
    return almacen;
  }

  public getEstanterias(): readonly Estanteria[] {
    return [...this.estanterias];
  }

  public getPasillosLibres(): Pasillo[] {
    return [...this.celdas.values()]
      .filter((celda): celda is Pasillo =>
        celda instanceof Pasillo && !celda.estaOcupada())
      .sort((a, b) => a.x - b.x || a.y - b.y);
  }

  public getMuelles(): Muelle[] {
    return [...this.muelles.values()];
  }

  public getBases(): BaseCarga[] {
    return [...this.bases.values()];
  }

  public getMuelle(id: string): Muelle {
    const muelle = this.muelles.get(id);
    if (!muelle) throw new Error(`No existe el muelle ${id}`);
    return muelle;
  }

  public getBase(id: string): BaseCarga {
    const base = this.bases.get(id);
    if (!base) throw new Error(`No existe la base ${id}`);
    return base;
  }

  public getCelda(posicion: Posicion): Celda {
    const celda = this.celdas.get(posicionKey(posicion));
    if (!celda) throw new Error(`La posición (${posicion.x},${posicion.y}) está fuera del almacén`);
    return celda;
  }

  public estaDentro(posicion: Posicion): boolean {
    return posicion.x >= 0 && posicion.x < this.width
      && posicion.y >= 0 && posicion.y < this.height;
  }

  public estaOcupada(posicion: Posicion): boolean {
    return this.getCelda(posicion).estaOcupada();
  }

  public ocupar(posicion: Posicion): void {
    this.getCelda(posicion).ocupar();
  }

  public liberar(posicion: Posicion): void {
    this.getCelda(posicion).liberar();
  }

  public moverOcupacion(desde: Posicion, hasta: Posicion): boolean {
    const origen = this.getCelda(desde);
    const destino = this.getCelda(hasta);
    if (!origen.estaOcupada()) {
      throw new Error(`No hay ocupación para mover desde (${desde.x},${desde.y})`);
    }
    if (destino.estaOcupada()) return false;

    origen.liberar();
    try {
      destino.ocupar();
    } catch (error) {
      origen.ocupar();
      throw error;
    }
    return true;
  }

  public buscarEstanteriaConPaquete(paqueteId: string): Estanteria | null {
    return this.estanterias.find(
      estanteria => estanteria.getPaquete()?.getId() === paqueteId,
    ) ?? null;
  }

  public reservar(posicion: Posicion, robotId: string): void {
    const celda = this.getCelda(posicion);
    if (!(celda instanceof CeldaReservable)) {
      throw new Error(`La celda (${posicion.x},${posicion.y}) no admite reservas`);
    }
    celda.reservar(robotId);
  }

  public liberarReserva(posicion: Posicion, robotId: string): void {
    const celda = this.getCelda(posicion);
    if (celda instanceof CeldaReservable) celda.liberarReserva(robotId);
  }

  private agregarEstanteria(estanteria: Estanteria): void {
    this.validarCeldaEspecial(estanteria.posicion);
    this.celdas.set(posicionKey(estanteria.posicion), estanteria);
    this.estanterias.push(estanteria);
  }

  private agregarMuelle(muelle: Muelle): void {
    this.validarCeldaEspecial(muelle.posicion);
    if (this.muelles.has(muelle.id)) throw new Error(`Muelle duplicado: ${muelle.id}`);
    this.celdas.set(posicionKey(muelle.posicion), muelle);
    this.muelles.set(muelle.id, muelle);
  }

  private agregarBase(base: BaseCarga): void {
    this.validarCeldaEspecial(base.posicion);
    if (this.bases.has(base.id)) throw new Error(`Base duplicada: ${base.id}`);
    this.celdas.set(posicionKey(base.posicion), base);
    this.bases.set(base.id, base);
  }

  private validarCeldaEspecial(posicion: Posicion): void {
    if (!this.estaDentro(posicion)) {
      throw new Error(`La posición (${posicion.x},${posicion.y}) está fuera del almacén`);
    }
    if (!(this.getCelda(posicion) instanceof Pasillo)) {
      throw new Error(`Ya existe una celda especial en (${posicion.x},${posicion.y})`);
    }
  }
}
