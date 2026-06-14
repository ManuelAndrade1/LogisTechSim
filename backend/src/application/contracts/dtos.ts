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

export interface EstadoAlmacenDTO {
  dimensiones: { width: number; height: number };
  robots: Array<{
    id: string;
    x: number;
    y: number;
    estado: string;
    carga: boolean;
    bateria: number;
    ordenId: string | null;
    paqueteId: string | null;
  }>;
  ordenes: Array<{
    id: string;
    camionId: string;
    tipoCamion: 'RECEPCION' | 'DESPACHO';
    estado: 'PENDIENTE' | 'COMPLETADA';
    robotId: string | null;
    paqueteId: string;
    tipoPaquete: 'COMESTIBLE' | 'GENERAL';
    peso: number;
    vencimiento: string | null;
  }>;
  camiones: Array<{
    x: number;
    y: number;
    tipo: 'RECEPCION' | 'DESPACHO';
  }>;
  estanterias: Array<{
    x: number;
    y: number;
    paquetes: Array<{
      id: string | null;
      tipo: string;
      peso: number;
      vencimiento: string | null;
    }>;
  }>;
  basesCarga: Array<{ x: number; y: number }>;
}
