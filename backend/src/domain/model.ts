export interface Posicion {
  readonly x: number;
  readonly y: number;
}

export const posicionKey = ({ x, y }: Posicion): string => `${x},${y}`;

export const mismaPosicion = (a: Posicion, b: Posicion): boolean =>
  a.x === b.x && a.y === b.y;

export const distanciaManhattan = (a: Posicion, b: Posicion): number =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export enum EstadoRobot {
  INACTIVO = 'INACTIVO',
  OPERANDO = 'OPERANDO',
  BATERIA_BAJA = 'BATERIA_BAJA',
  RECARGANDO = 'RECARGANDO',
}

export enum EstrategiaNavegacion {
  MOVIMIENTO_L = 'MOVIMIENTO_L',
  A_STAR = 'A_STAR',
}

export enum EstadoOrden {
  PENDIENTE = 'PENDIENTE',
  COMPLETADA = 'COMPLETADA',
}

export enum EstadoCamion {
  ACOPLADO = 'ACOPLADO',
  TRABAJANDO = 'TRABAJANDO',
  RETIRADO = 'RETIRADO',
}

export type TipoCamion = 'RECEPCION' | 'DESPACHO';
export type TipoPaquete = 'COMESTIBLE' | 'GENERAL';
export type FaseTarea = 'HACIA_ORIGEN' | 'HACIA_DESTINO';

export interface ManifiestoOrden {
  readonly id: string;
  readonly paqueteId: string;
  readonly tipoPaquete: TipoPaquete;
  readonly peso: number;
  readonly vencimiento: Date | null;
}

export abstract class Paquete {
  private id: string | null;

  protected constructor(
    id: string | null,
    public readonly idPlanificado: string,
    public readonly peso: number,
    public readonly tipo: TipoPaquete,
  ) {
    if (!idPlanificado) throw new Error('El paquete debe tener un identificador planificado');
    if (!Number.isFinite(peso) || peso < 0) throw new Error('El peso del paquete es inválido');
    this.id = id;
  }

  public getId(): string | null {
    return this.id;
  }

  public existeFisicamente(): boolean {
    return this.id !== null;
  }

  public materializar(): void {
    if (this.id !== null) throw new Error(`El paquete ${this.id} ya fue materializado`);
    this.id = this.idPlanificado;
  }

  public abstract getVencimiento(): Date | null;
}

export class PaqueteGeneral extends Paquete {
  constructor(id: string | null, idPlanificado: string, peso: number) {
    super(id, idPlanificado, peso, 'GENERAL');
  }

  public getVencimiento(): Date | null {
    return null;
  }
}

export class PaqueteComestible extends Paquete {
  constructor(
    id: string | null,
    idPlanificado: string,
    peso: number,
    private readonly vencimiento: Date | null,
  ) {
    super(id, idPlanificado, peso, 'COMESTIBLE');
  }

  public getVencimiento(): Date | null {
    return this.vencimiento;
  }
}

export class Orden {
  private estado: EstadoOrden = EstadoOrden.PENDIENTE;
  private robotId: string | null = null;
  private origen: Posicion | null = null;
  private destino: Posicion | null = null;
  private paquete: Paquete;

  constructor(
    public readonly id: string,
    public readonly camionId: string,
    public readonly tipoCamion: TipoCamion,
    paquete: Paquete,
  ) {
    if (!id) throw new Error('La orden debe tener identificador');
    this.paquete = paquete;
  }

  public getEstado(): EstadoOrden {
    return this.estado;
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
    return this.origen;
  }

  public getDestino(): Posicion {
    if (!this.destino) throw new Error(`La orden ${this.id} todavía no tiene destino`);
    return this.destino;
  }

  public asignar(robotId: string, origen: Posicion, destino: Posicion): void {
    if (this.estado === EstadoOrden.COMPLETADA) throw new Error('No se puede asignar una orden completada');
    if (this.robotId !== null) throw new Error(`La orden ${this.id} ya está asignada`);
    this.robotId = robotId;
    this.origen = { ...origen };
    this.destino = { ...destino };
  }

  public completar(): void {
    if (!this.robotId) throw new Error(`La orden ${this.id} no está asignada`);
    this.estado = EstadoOrden.COMPLETADA;
  }
}

export class Camion {
  private estado: EstadoCamion | null = null;
  private tickAcople: number | null = null;
  private ordenesRegistradas = false;
  private ordenes: Orden[] = [];

  constructor(
    public readonly id: string,
    public readonly tipo: TipoCamion,
    public readonly muelleId: string,
    public readonly manifiesto: readonly ManifiestoOrden[],
  ) {
    if (!id) throw new Error('El camión debe tener identificador');
    if (!muelleId) throw new Error(`El camión ${id} debe indicar un muelle`);
  }

  public acoplar(tick: number): void {
    if (this.estado !== null) throw new Error(`El camión ${this.id} ya fue procesado`);
    this.estado = EstadoCamion.ACOPLADO;
    this.tickAcople = tick;
  }

  public puedeRegistrarOrdenes(tick: number): boolean {
    return this.estado === EstadoCamion.ACOPLADO
      && this.tickAcople !== null
      && tick >= this.tickAcople + 1
      && !this.ordenesRegistradas;
  }

  public registrarOrdenes(ordenes: Orden[]): void {
    if (this.ordenesRegistradas) throw new Error(`Las órdenes de ${this.id} ya fueron registradas`);
    this.ordenes = ordenes;
    this.ordenesRegistradas = true;
    this.estado = EstadoCamion.TRABAJANDO;
  }

  public getOrdenes(): readonly Orden[] {
    return this.ordenes;
  }

  public tieneOrdenesRegistradas(): boolean {
    return this.ordenesRegistradas;
  }

  public estaAcoplado(): boolean {
    return this.estado === EstadoCamion.ACOPLADO || this.estado === EstadoCamion.TRABAJANDO;
  }

  public estaTerminado(): boolean {
    return this.ordenesRegistradas
      && this.ordenes.every(orden => orden.getEstado() === EstadoOrden.COMPLETADA);
  }

  public retirar(): void {
    if (!this.estaTerminado()) throw new Error(`El camión ${this.id} todavía tiene órdenes pendientes`);
    this.estado = EstadoCamion.RETIRADO;
  }
}

export abstract class Celda {
  protected constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly tipo: 'PASILLO' | 'ESTANTERIA' | 'MUELLE' | 'BASE_CARGA',
  ) {}

  public get posicion(): Posicion {
    return { x: this.x, y: this.y };
  }
}

export class Pasillo extends Celda {
  constructor(x: number, y: number) {
    super(x, y, 'PASILLO');
  }
}

abstract class CeldaReservable extends Celda {
  private reservadaPor: string | null = null;

  public estaDisponiblePara(robotId?: string): boolean {
    return this.reservadaPor === null || this.reservadaPor === robotId;
  }

  public reservar(robotId: string): void {
    if (!this.estaDisponiblePara(robotId)) {
      throw new Error(`La celda (${this.x},${this.y}) ya está reservada`);
    }
    this.reservadaPor = robotId;
  }

  public liberar(robotId: string): void {
    if (this.reservadaPor === robotId) this.reservadaPor = null;
  }

  public getReserva(): string | null {
    return this.reservadaPor;
  }
}

export class Estanteria extends CeldaReservable {
  private paquete: Paquete | null = null;

  constructor(x: number, y: number) {
    super(x, y, 'ESTANTERIA');
  }

  public estaVacia(): boolean {
    return this.paquete === null;
  }

  public getPaquete(): Paquete | null {
    return this.paquete;
  }

  public guardar(paquete: Paquete): void {
    if (!this.estaVacia()) throw new Error(`La estantería (${this.x},${this.y}) está ocupada`);
    if (!paquete.existeFisicamente()) throw new Error('No se puede guardar un paquete preliminar');
    this.paquete = paquete;
  }

  public retirarPaquete(esperadoId: string): Paquete {
    if (!this.paquete || this.paquete.getId() !== esperadoId) {
      throw new Error(`La estantería (${this.x},${this.y}) no contiene ${esperadoId}`);
    }
    const paquete = this.paquete;
    this.paquete = null;
    return paquete;
  }
}

export class Muelle extends CeldaReservable {
  private camion: Camion | null = null;

  constructor(x: number, y: number, public readonly id: string) {
    super(x, y, 'MUELLE');
  }

  public getCamion(): Camion | null {
    return this.camion;
  }

  public acoplar(camion: Camion): void {
    if (this.camion) throw new Error(`El muelle ${this.id} está ocupado`);
    this.camion = camion;
  }

  public desacoplar(camionId: string): Camion {
    if (!this.camion || this.camion.id !== camionId) {
      throw new Error(`El camión ${camionId} no está acoplado en ${this.id}`);
    }
    const camion = this.camion;
    this.camion = null;
    return camion;
  }
}

export class BaseCarga extends CeldaReservable {
  constructor(x: number, y: number, public readonly id: string) {
    super(x, y, 'BASE_CARGA');
  }
}

export type ResultadoActividadRobot =
  | { tipo: 'MOVIMIENTO_REALIZADO'; robot: Robot; desde: Posicion; hasta: Posicion }
  | { tipo: 'MOVIMIENTO_BLOQUEADO'; robot: Robot; destino: Posicion }
  | { tipo: 'SOLICITA_CARGA'; robot: Robot }
  | { tipo: 'SOLICITA_DESCARGA'; robot: Robot }
  | { tipo: 'EN_RECARGA'; robot: Robot }
  | { tipo: 'SIN_ACTIVIDAD'; robot: Robot };

export interface ContextoTickRobot {
  puedeOcupar(posicion: Posicion, robotId: string): boolean;
}

export interface ObservadorTickRobot {
  readonly id: string;
  ejecutarTick(contexto: ContextoTickRobot): ResultadoActividadRobot;
}

export class Robot implements ObservadorTickRobot {
  private estado: EstadoRobot = EstadoRobot.INACTIVO;
  private estrategia: EstrategiaNavegacion = EstrategiaNavegacion.MOVIMIENTO_L;
  private bloqueos = 0;
  private ruta: Posicion[] = [];
  private carga: Paquete | null = null;
  private orden: Orden | null = null;
  private fase: FaseTarea | null = null;
  private baseCargaId: string | null = null;
  private requiereDespeje = false;
  private destinoDespeje: Posicion | null = null;

  constructor(
    public readonly id: string,
    private x: number,
    private y: number,
    private bateria: number,
  ) {
    if (!id) throw new Error('El robot debe tener identificador');
    if (!Number.isFinite(bateria) || bateria < 0 || bateria > 100) {
      throw new Error(`La batería inicial de ${id} es inválida`);
    }
  }

  public getPosicion(): Posicion {
    return { x: this.x, y: this.y };
  }

  public getBateria(): number {
    return this.bateria;
  }

  public getEstado(): EstadoRobot {
    return this.estado;
  }

  public getEstrategia(): EstrategiaNavegacion {
    return this.estrategia;
  }

  public getBloqueos(): number {
    return this.bloqueos;
  }

  public getOrden(): Orden | null {
    return this.orden;
  }

  public getFase(): FaseTarea | null {
    return this.fase;
  }

  public getCarga(): Paquete | null {
    return this.carga;
  }

  public getBaseCargaId(): string | null {
    return this.baseCargaId;
  }

  public estaDisponible(): boolean {
    return this.estado === EstadoRobot.INACTIVO && this.orden === null;
  }

  public necesitaDespejar(): boolean {
    return this.requiereDespeje;
  }

  public estaDespejando(): boolean {
    return this.requiereDespeje && this.destinoDespeje !== null;
  }

  public getDestinoDespeje(): Posicion | null {
    return this.destinoDespeje ? { ...this.destinoDespeje } : null;
  }

  public tieneRuta(): boolean {
    return this.ruta.length > 0;
  }

  public asignarOrden(orden: Orden): void {
    if (!this.estaDisponible()) throw new Error(`El robot ${this.id} no está disponible`);
    this.cancelarDespeje();
    this.orden = orden;
    this.fase = 'HACIA_ORIGEN';
    this.estado = EstadoRobot.OPERANDO;
    this.ruta = [];
  }

  public asignarRuta(ruta: readonly Posicion[]): void {
    this.ruta = ruta.map(posicion => ({ ...posicion }));
  }

  public limpiarRuta(): void {
    this.ruta = [];
  }

  public registrarBloqueo(): number {
    this.bloqueos += 1;
    return this.bloqueos;
  }

  public cambiarEstrategia(): void {
    this.estrategia = this.estrategia === EstrategiaNavegacion.MOVIMIENTO_L
      ? EstrategiaNavegacion.A_STAR
      : EstrategiaNavegacion.MOVIMIENTO_L;
    this.bloqueos = 0;
    this.ruta = [];
  }

  public cargar(paquete: Paquete): void {
    if (this.carga) throw new Error(`El robot ${this.id} ya transporta un paquete`);
    if (!this.orden || this.fase !== 'HACIA_ORIGEN') throw new Error('El robot no está listo para cargar');
    this.carga = paquete;
    this.fase = 'HACIA_DESTINO';
    this.ruta = [];
  }

  public descargar(): Paquete {
    if (!this.carga) throw new Error(`El robot ${this.id} no transporta un paquete`);
    const paquete = this.carga;
    this.carga = null;
    return paquete;
  }

  public completarOrden(): void {
    if (!this.orden) throw new Error(`El robot ${this.id} no tiene una orden`);
    this.orden = null;
    this.fase = null;
    this.ruta = [];
    this.bloqueos = 0;
    this.estado = EstadoRobot.INACTIVO;
    this.requiereDespeje = true;
    this.destinoDespeje = null;
  }

  public iniciarDespeje(destino: Posicion, ruta: readonly Posicion[]): void {
    if (this.orden || this.estado !== EstadoRobot.INACTIVO) {
      throw new Error(`El robot ${this.id} no puede iniciar un despeje`);
    }
    this.requiereDespeje = true;
    this.destinoDespeje = { ...destino };
    this.asignarRuta(ruta);
  }

  public cancelarDespeje(): void {
    this.requiereDespeje = false;
    this.destinoDespeje = null;
    this.ruta = [];
    this.bloqueos = 0;
  }

  public finalizarDespeje(): void {
    if (!this.destinoDespeje || !mismaPosicion(this.getPosicion(), this.destinoDespeje)) {
      throw new Error(`El robot ${this.id} no llegó al destino de despeje`);
    }
    this.cancelarDespeje();
  }

  public iniciarDesvioARecarga(baseId: string): void {
    this.baseCargaId = baseId;
    this.estado = EstadoRobot.BATERIA_BAJA;
    this.ruta = [];
  }

  public comenzarRecarga(): void {
    if (!this.baseCargaId) throw new Error(`El robot ${this.id} no tiene una base asignada`);
    this.estado = EstadoRobot.RECARGANDO;
    this.ruta = [];
  }

  public recargar(cantidad: number): void {
    if (this.estado !== EstadoRobot.RECARGANDO) throw new Error(`El robot ${this.id} no está recargando`);
    this.bateria = Math.min(100, this.bateria + cantidad);
  }

  public finalizarRecarga(): void {
    if (this.bateria < 100) throw new Error(`El robot ${this.id} todavía no completó la recarga`);
    this.baseCargaId = null;
    this.estado = this.orden ? EstadoRobot.OPERANDO : EstadoRobot.INACTIVO;
    this.ruta = [];
  }

  public ejecutarTick(contexto: ContextoTickRobot): ResultadoActividadRobot {
    if (this.estado === EstadoRobot.RECARGANDO) {
      return { tipo: 'EN_RECARGA', robot: this };
    }

    if (this.orden && this.estado === EstadoRobot.OPERANDO) {
      const objetivo = this.fase === 'HACIA_ORIGEN'
        ? this.orden.getOrigen()
        : this.orden.getDestino();

      if (mismaPosicion(this.getPosicion(), objetivo)) {
        if (this.fase === 'HACIA_ORIGEN' && !this.carga) {
          return { tipo: 'SOLICITA_CARGA', robot: this };
        }
        if (this.fase === 'HACIA_DESTINO' && this.carga) {
          return { tipo: 'SOLICITA_DESCARGA', robot: this };
        }
      }
    }

    if (this.ruta.length === 0) return { tipo: 'SIN_ACTIVIDAD', robot: this };

    const siguiente = this.ruta[0];
    if (!contexto.puedeOcupar(siguiente, this.id)) {
      return { tipo: 'MOVIMIENTO_BLOQUEADO', robot: this, destino: { ...siguiente } };
    }

    const costo = this.carga ? 2 : 1;
    if (this.bateria < costo) return { tipo: 'SIN_ACTIVIDAD', robot: this };

    const desde = this.getPosicion();
    this.x = siguiente.x;
    this.y = siguiente.y;
    this.ruta.shift();
    this.bateria -= costo;
    this.bloqueos = 0;
    if (this.destinoDespeje && mismaPosicion(this.getPosicion(), this.destinoDespeje)) {
      this.finalizarDespeje();
    }

    return {
      tipo: 'MOVIMIENTO_REALIZADO',
      robot: this,
      desde,
      hasta: this.getPosicion(),
    };
  }
}

export class Almacen {
  private readonly celdas = new Map<string, Celda>();
  private readonly robots = new Map<string, Robot>();
  private readonly muelles = new Map<string, Muelle>();
  private readonly bases = new Map<string, BaseCarga>();
  private readonly estanterias: Estanteria[] = [];

  constructor(
    public readonly width: number,
    public readonly height: number,
  ) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
      throw new Error('Las dimensiones del almacén son inválidas');
    }
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        this.celdas.set(posicionKey({ x, y }), new Pasillo(x, y));
      }
    }
  }

  public agregarEstanteria(estanteria: Estanteria): void {
    this.validarCeldaEspecial(estanteria.posicion);
    this.celdas.set(posicionKey(estanteria.posicion), estanteria);
    this.estanterias.push(estanteria);
  }

  public agregarMuelle(muelle: Muelle): void {
    this.validarCeldaEspecial(muelle.posicion);
    if (this.muelles.has(muelle.id)) throw new Error(`Muelle duplicado: ${muelle.id}`);
    this.celdas.set(posicionKey(muelle.posicion), muelle);
    this.muelles.set(muelle.id, muelle);
  }

  public agregarBase(base: BaseCarga): void {
    this.validarCeldaEspecial(base.posicion);
    if (this.bases.has(base.id)) throw new Error(`Base duplicada: ${base.id}`);
    this.celdas.set(posicionKey(base.posicion), base);
    this.bases.set(base.id, base);
  }

  public agregarRobot(robot: Robot): void {
    if (this.robots.has(robot.id)) throw new Error(`Robot duplicado: ${robot.id}`);
    this.validarPosicion(robot.getPosicion());
    if (this.estaOcupada(robot.getPosicion())) {
      throw new Error(`La posición inicial de ${robot.id} está ocupada`);
    }
    this.robots.set(robot.id, robot);
  }

  public getRobots(): Robot[] {
    return [...this.robots.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  public getEstanterias(): readonly Estanteria[] {
    return this.estanterias;
  }

  public getPasillosLibres(exceptoRobotId?: string): Pasillo[] {
    return [...this.celdas.values()]
      .filter((celda): celda is Pasillo =>
        celda instanceof Pasillo && !this.estaOcupada(celda.posicion, exceptoRobotId))
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

  public estaOcupada(posicion: Posicion, exceptoRobotId?: string): boolean {
    return this.getRobots().some(robot =>
      robot.id !== exceptoRobotId && mismaPosicion(robot.getPosicion(), posicion));
  }

  public buscarEstanteriaConPaquete(paqueteId: string): Estanteria | null {
    return this.estanterias.find(estanteria => estanteria.getPaquete()?.getId() === paqueteId) ?? null;
  }

  public reservar(posicion: Posicion, robotId: string): void {
    const celda = this.getCelda(posicion);
    if (!(celda instanceof Estanteria || celda instanceof Muelle || celda instanceof BaseCarga)) {
      throw new Error(`La celda (${posicion.x},${posicion.y}) no admite reservas`);
    }
    celda.reservar(robotId);
  }

  public liberarReserva(posicion: Posicion, robotId: string): void {
    const celda = this.getCelda(posicion);
    if (celda instanceof Estanteria || celda instanceof Muelle || celda instanceof BaseCarga) {
      celda.liberar(robotId);
    }
  }

  private validarCeldaEspecial(posicion: Posicion): void {
    this.validarPosicion(posicion);
    if (!(this.getCelda(posicion) instanceof Pasillo)) {
      throw new Error(`Ya existe una celda especial en (${posicion.x},${posicion.y})`);
    }
  }

  private validarPosicion(posicion: Posicion): void {
    if (!this.estaDentro(posicion)) {
      throw new Error(`La posición (${posicion.x},${posicion.y}) está fuera del almacén`);
    }
  }
}
