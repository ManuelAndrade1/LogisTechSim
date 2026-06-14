import { Orden } from '../../domain/entities/Orden';
import { Posicion } from '../../domain/shared/Posicion';
import { FaseTarea } from '../../domain/shared/tipos';

export interface ContextoRobot {
  orden: Orden | null;
  fase: FaseTarea | null;
  baseCargaId: string | null;
  requiereDespeje: boolean;
  destinoDespeje: Posicion | null;
}

export const crearContextoRobot = (): ContextoRobot => ({
  orden: null,
  fase: null,
  baseCargaId: null,
  requiereDespeje: false,
  destinoDespeje: null,
});
