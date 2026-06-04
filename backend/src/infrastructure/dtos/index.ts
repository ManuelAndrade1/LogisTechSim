export interface MapaConfigDTO {
  dimensiones: { width: number; height: number };
  estanterias: { x: number; y: number }[];
  muelles: { x: number; y: number; id: string }[];
  basesCarga: { x: number; y: number; id: string }[];
}

export interface RobotConfigDTO {
  id: string;
  x: number;
  y: number;
  bateria: number;
}

export interface OrdenDTO {
  id: string;
  camionId: string;
  paqueteId: string;
  tipoPaquete: string;
  peso: number;
  vencimiento: string | null;
}

export interface CamionDTO {
  id: string;
  tipo: 'RECEPCION' | 'DESPACHO';
  muelleId: string;
  tickLlegada: number;
  ordenes: OrdenDTO[];
}
