import { Paquete } from './Paquete';
import { Posicion, distanciaManhattan } from '../shared/Posicion';
import { EstadoRobot, EstrategiaNavegacion } from '../shared/tipos';

export type ResultadoMovimientoRobot =
  | { tipo: 'MOVIMIENTO_REALIZADO'; desde: Posicion; hasta: Posicion }
  | { tipo: 'MOVIMIENTO_BLOQUEADO'; destino: Posicion }
  | { tipo: 'SIN_RUTA' };

export interface ContextoMovimientoRobot {
  intentarMover(desde: Posicion, hasta: Posicion): boolean;
}

export class Robot {
  private estado = EstadoRobot.INACTIVO;
  private estrategia = EstrategiaNavegacion.MOVIMIENTO_L;
  private bloqueos = 0;
  private ruta: Posicion[] = [];
  private carga: Paquete | null = null;

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

  public getCarga(): Paquete | null {
    return this.carga;
  }

  public tieneRuta(): boolean {
    return this.ruta.length > 0;
  }

  public getSiguientePaso(): Posicion | null {
    return this.ruta[0] ? { ...this.ruta[0] } : null;
  }

  public cambiarEstado(estado: EstadoRobot): void {
    this.estado = estado;
    if (estado === EstadoRobot.RECARGANDO) this.limpiarRuta();
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

  public reiniciarBloqueos(): void {
    this.bloqueos = 0;
  }

  public cambiarEstrategia(): void {
    this.estrategia = this.estrategia === EstrategiaNavegacion.MOVIMIENTO_L
      ? EstrategiaNavegacion.A_STAR
      : EstrategiaNavegacion.MOVIMIENTO_L;
    this.bloqueos = 0;
    this.limpiarRuta();
  }

  public cargar(paquete: Paquete): void {
    if (this.carga) throw new Error(`El robot ${this.id} ya transporta un paquete`);
    this.carga = paquete;
    this.limpiarRuta();
  }

  public descargar(): Paquete {
    if (!this.carga) throw new Error(`El robot ${this.id} no transporta un paquete`);
    const paquete = this.carga;
    this.carga = null;
    return paquete;
  }

  public recargar(cantidad = 10): void {
    if (this.estado !== EstadoRobot.RECARGANDO) {
      throw new Error(`El robot ${this.id} no está recargando`);
    }
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw new Error('La cantidad de recarga debe ser positiva');
    }
    this.actualizarBateria(cantidad);
  }

  public ejecutarSiguienteMovimiento(
    contexto: ContextoMovimientoRobot,
  ): ResultadoMovimientoRobot {
    const siguiente = this.ruta[0];
    if (!siguiente) return { tipo: 'SIN_RUTA' };

    const costo = this.carga ? 2 : 1;
    if (this.bateria < costo) {
      throw new Error(`El robot ${this.id} no tiene batería para ejecutar el movimiento`);
    }

    const desde = this.getPosicion();
    if (distanciaManhattan(desde, siguiente) !== 1) {
      throw new Error(`La ruta de ${this.id} contiene un movimiento no adyacente`);
    }
    if (!contexto.intentarMover(desde, siguiente)) {
      return { tipo: 'MOVIMIENTO_BLOQUEADO', destino: { ...siguiente } };
    }

    this.x = siguiente.x;
    this.y = siguiente.y;
    this.ruta.shift();
    this.actualizarBateria(-costo);
    this.reiniciarBloqueos();
    return { tipo: 'MOVIMIENTO_REALIZADO', desde, hasta: this.getPosicion() };
  }

  private actualizarBateria(delta: number): void {
    const siguiente = Math.max(0, Math.min(100, this.bateria + delta));
    this.bateria = siguiente;
  }
}
