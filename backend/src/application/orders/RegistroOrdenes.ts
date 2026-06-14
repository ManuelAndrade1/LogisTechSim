import { Orden } from '../../domain/entities/Orden';

export class RegistroOrdenes {
  private readonly ordenes = new Map<string, Orden>();

  public registrar(orden: Orden): void {
    if (this.ordenes.has(orden.id)) throw new Error(`Orden duplicada: ${orden.id}`);
    this.ordenes.set(orden.id, orden);
  }

  public registrarTodas(ordenes: readonly Orden[]): void {
    const ids = new Set<string>();
    for (const orden of ordenes) {
      if (ids.has(orden.id) || this.ordenes.has(orden.id)) {
        throw new Error(`Orden duplicada: ${orden.id}`);
      }
      ids.add(orden.id);
    }
    for (const orden of ordenes) this.ordenes.set(orden.id, orden);
  }

  public getTodas(): Orden[] {
    return [...this.ordenes.values()];
  }
}
