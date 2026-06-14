import { Posicion } from '../../domain/shared/Posicion';
import { Robot } from '../../domain/entities/Robot';

export type ResultadoActividadRobot =
  | { tipo: 'MOVIMIENTO_REALIZADO'; robot: Robot; desde: Posicion; hasta: Posicion }
  | { tipo: 'MOVIMIENTO_BLOQUEADO'; robot: Robot; destino: Posicion }
  | { tipo: 'SOLICITA_CARGA'; robot: Robot }
  | { tipo: 'SOLICITA_DESCARGA'; robot: Robot }
  | { tipo: 'EN_RECARGA'; robot: Robot }
  | { tipo: 'SIN_ACTIVIDAD'; robot: Robot };
