import { Almacen } from '../../domain/entities/Almacen';
import { Robot } from '../../domain/entities/Robot';
import { CalculadorRutas } from '../../domain/navigation/CalculadorRutas';
import { ResultadoCalculoRuta } from '../../domain/navigation/ResultadoCalculoRuta';
import { Posicion } from '../../domain/shared/Posicion';

export class AsignadorRutas {
  constructor(
    private readonly almacen: Almacen,
    private readonly calculador: CalculadorRutas,
  ) {}

  public asignar(robot: Robot, destino: Posicion): ResultadoCalculoRuta {
    const resultado = this.calculador.calcular(
      robot.getEstrategia(),
      robot.getPosicion(),
      destino,
      this.almacen,
    );
    robot.asignarRuta(resultado.tipo === 'RUTA' ? resultado.pasos : []);
    return resultado;
  }
}
