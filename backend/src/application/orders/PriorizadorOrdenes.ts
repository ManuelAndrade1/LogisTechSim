import { Orden } from '../../domain/entities/Orden';

export interface PoliticaPriorizacionOrdenes {
  priorizar(ordenes: readonly Orden[]): Orden[];
}

export class PriorizadorOrdenes implements PoliticaPriorizacionOrdenes {
  public priorizar(ordenes: readonly Orden[]): Orden[] {
    return [...ordenes].sort((a, b) => {
      const paqueteA = a.getPaquete();
      const paqueteB = b.getPaquete();
      if (paqueteA.tipo !== paqueteB.tipo) return paqueteA.tipo === 'COMESTIBLE' ? -1 : 1;

      if (paqueteA.tipo === 'COMESTIBLE') {
        const fechaA = paqueteA.getVencimiento()?.getTime() ?? Number.POSITIVE_INFINITY;
        const fechaB = paqueteB.getVencimiento()?.getTime() ?? Number.POSITIVE_INFINITY;
        if (fechaA !== fechaB) return fechaA - fechaB;
      } else if (paqueteA.peso !== paqueteB.peso) {
        return paqueteB.peso - paqueteA.peso;
      }
      return a.id.localeCompare(b.id);
    });
  }
}
