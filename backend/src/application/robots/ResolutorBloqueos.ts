import { Almacen } from '../../domain/entities/Almacen';
import { Pasillo } from '../../domain/entities/Pasillo';
import { Robot } from '../../domain/entities/Robot';
import { Posicion, mismaPosicion } from '../../domain/shared/Posicion';
import { AsignadorRutas } from './AsignadorRutas';

export interface ResolutorBloqueos {
  resolver(robot: Robot, destinoBloqueado: Posicion): boolean;
}

export class ResolutorBloqueosSinAccion implements ResolutorBloqueos {
  public resolver(): boolean {
    return false;
  }
}

export interface GeneradorAleatorio {
  siguiente(): number;
}

export class GeneradorAleatorioMath implements GeneradorAleatorio {
  public siguiente(): number {
    return Math.random();
  }
}

export interface SelectorDestinoCesion {
  seleccionar(robot: Robot, candidatos: readonly Pasillo[]): Pasillo | null;
}

export class SelectorDestinoCesionAleatorio implements SelectorDestinoCesion {
  constructor(
    private readonly generador: GeneradorAleatorio = new GeneradorAleatorioMath(),
  ) {}

  public seleccionar(robot: Robot, candidatos: readonly Pasillo[]): Pasillo | null {
    const posicionActual = robot.getPosicion();
    const disponibles = candidatos.filter(
      candidato => !mismaPosicion(candidato.posicion, posicionActual),
    );
    if (disponibles.length === 0) return null;

    const valor = Math.max(0, Math.min(this.generador.siguiente(), 0.999999999));
    return disponibles[Math.floor(valor * disponibles.length)];
  }
}

export class ResolutorCesionPuntual implements ResolutorBloqueos {
  constructor(
    private readonly almacen: Almacen,
    private readonly rutas: AsignadorRutas,
    private readonly selectorDestino: SelectorDestinoCesion = new SelectorDestinoCesionAleatorio(),
  ) {}

  public resolver(robot: Robot, destinoBloqueado: Posicion): boolean {
    if (!this.almacen.estaOcupada(destinoBloqueado)) return false;

    const candidatos = this.almacen.getPasillosLibres()
      .filter(pasillo => this.rutas.calcular(robot, pasillo.posicion).tipo === 'RUTA');
    const destinoCesion = this.selectorDestino.seleccionar(robot, candidatos);

    if (!destinoCesion) return false;

    const resultado = this.rutas.asignar(robot, destinoCesion.posicion);
    return resultado.tipo === 'RUTA';
  }
}
