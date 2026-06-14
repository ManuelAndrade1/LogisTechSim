import { Almacen } from '../../domain/entities/Almacen';
import { RegistroRobots } from '../../domain/registries/RegistroRobots';
import { AsignadorOrdenes } from '../orders/AsignadorOrdenes';
import { OrquestadorOrdenes } from '../orders/OrquestadorOrdenes';
import { RegistroOrdenes } from '../orders/RegistroOrdenes';
import { GestorRecarga } from '../recharge/GestorRecarga';
import { ControladorRobots } from '../robots/ControladorRobots';
import { EjecutorRobotsPorTick } from '../robots/EjecutorRobotsPorTick';
import { OrquestadorRobots } from '../robots/OrquestadorRobots';
import { GestorTransferencias } from '../transfers/GestorTransferencias';
import { GestorCamiones } from '../trucks/GestorCamiones';
import { ProcesadorManifiestos } from '../trucks/ProcesadorManifiestos';
import { RetiradorCamionesCompletos } from '../trucks/RetiradorCamionesCompletos';

export interface ContextoSimulacion {
  almacen: Almacen;
  robots: RegistroRobots;
  controladorRobots: ControladorRobots;
  gestorCamiones: GestorCamiones;
  procesadorManifiestos: ProcesadorManifiestos;
  registroOrdenes: RegistroOrdenes;
  orquestadorOrdenes: OrquestadorOrdenes;
  asignadorOrdenes: AsignadorOrdenes;
  orquestadorRobots: OrquestadorRobots;
  ejecutorRobots: EjecutorRobotsPorTick;
  gestorTransferencias: GestorTransferencias;
  gestorRecarga: GestorRecarga;
  retiradorCamiones: RetiradorCamionesCompletos;
}
