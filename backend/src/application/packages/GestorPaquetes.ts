import { Estanteria } from '../../domain/entities/Estanteria';
import { Paquete } from '../../domain/entities/Paquete';
import { PaqueteComestible } from '../../domain/entities/PaqueteComestible';
import { PaqueteGeneral } from '../../domain/entities/PaqueteGeneral';
import { ManifiestoOrden } from '../../domain/shared/tipos';

export class GestorPaquetes {
  public crearDesdeManifiesto(manifiesto: ManifiestoOrden, fisico: boolean): Paquete {
    const id = fisico ? manifiesto.paqueteId : null;
    if (manifiesto.tipoPaquete === 'COMESTIBLE') {
      return new PaqueteComestible(
        id,
        manifiesto.paqueteId,
        manifiesto.peso,
        manifiesto.vencimiento,
      );
    }
    return new PaqueteGeneral(id, manifiesto.paqueteId, manifiesto.peso);
  }

  public crearYGuardar(paquete: Paquete, estanteria: Estanteria): void {
    if (!estanteria.estaVacia()) {
      throw new Error(`La estantería (${estanteria.x},${estanteria.y}) está ocupada`);
    }
    paquete.materializar();
    estanteria.guardar(paquete);
  }

  public retirar(estanteria: Estanteria, paqueteId: string): Paquete {
    return estanteria.retirarPaquete(paqueteId);
  }
}
