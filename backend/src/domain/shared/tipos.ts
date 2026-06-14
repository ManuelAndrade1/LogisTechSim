export enum EstadoRobot {
  INACTIVO = 'INACTIVO',
  OPERANDO = 'OPERANDO',
  BATERIA_BAJA = 'BATERIA_BAJA',
  RECARGANDO = 'RECARGANDO',
}

export enum EstrategiaNavegacion {
  MOVIMIENTO_L = 'MOVIMIENTO_L',
  A_STAR = 'A_STAR',
}

export enum EstadoOrden {
  PENDIENTE = 'PENDIENTE',
  COMPLETADA = 'COMPLETADA',
}

export enum EstadoCamion {
  ACOPLADO = 'ACOPLADO',
  TRABAJANDO = 'TRABAJANDO',
  RETIRADO = 'RETIRADO',
}

export type TipoCamion = 'RECEPCION' | 'DESPACHO';
export type TipoPaquete = 'COMESTIBLE' | 'GENERAL';
export type FaseTarea = 'HACIA_ORIGEN' | 'HACIA_DESTINO';

export interface ManifiestoOrden {
  readonly id: string;
  readonly paqueteId: string;
  readonly tipoPaquete: TipoPaquete;
  readonly peso: number;
  readonly vencimiento: Date | null;
}
