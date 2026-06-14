export type TipoCamion = 'RECEPCION' | 'DESPACHO';
export type TipoPaquete = 'COMESTIBLE' | 'GENERAL';
export type EstadoOrden = 'PENDIENTE' | 'COMPLETADA';

export interface RobotState {
  id: string;
  x: number;
  y: number;
  estado: string;
  carga: boolean;
  bateria: number;
  ordenId: string | null;
  paqueteId: string | null;
}

export interface OrdenState {
  id: string;
  camionId: string;
  tipoCamion: TipoCamion;
  estado: EstadoOrden;
  robotId: string | null;
  paqueteId: string;
  tipoPaquete: TipoPaquete;
  peso: number;
  vencimiento: string | null;
}

export interface CamionState {
  x: number;
  y: number;
  tipo: TipoCamion;
}

export interface PaqueteState {
  id: string | null;
  tipo: TipoPaquete;
  peso: number;
  vencimiento: string | null;
}

export interface EstanteriaState {
  x: number;
  y: number;
  paquetes: PaqueteState[];
}

export interface BaseCargaState {
  x: number;
  y: number;
}

export interface SimuladorState {
  tick: number;
  dimensiones: { width: number; height: number };
  robots: RobotState[];
  ordenes: OrdenState[];
  camiones: CamionState[];
  estanterias: EstanteriaState[];
  basesCarga: BaseCargaState[];
}
