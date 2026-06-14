import { Almacen } from '../entities/Almacen';
import { Robot } from '../entities/Robot';

export class RegistroRobots {
  private readonly robots = new Map<string, Robot>();

  constructor(private readonly almacen: Almacen) {}

  public registrar(robot: Robot): void {
    if (this.robots.has(robot.id)) throw new Error(`Robot duplicado: ${robot.id}`);
    const posicion = robot.getPosicion();
    if (!this.almacen.estaDentro(posicion)) {
      throw new Error(`La posición inicial de ${robot.id} está fuera del almacén`);
    }
    this.almacen.ocupar(posicion);
    this.robots.set(robot.id, robot);
  }

  public get(id: string): Robot {
    const robot = this.robots.get(id);
    if (!robot) throw new Error(`No existe el robot ${id}`);
    return robot;
  }

  public getTodos(): Robot[] {
    return [...this.robots.values()].sort((a, b) => a.id.localeCompare(b.id));
  }
}
