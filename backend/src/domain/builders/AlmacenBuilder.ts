import { Almacen } from '../entities/Almacen';
import { BaseCarga } from '../entities/BaseCarga';
import { Estanteria } from '../entities/Estanteria';
import { Muelle } from '../entities/Muelle';

export class AlmacenBuilder {
  private dimensiones: { width: number; height: number } | null = null;
  private estanterias: Estanteria[] | null = null;
  private muelles: Muelle[] | null = null;
  private bases: BaseCarga[] | null = null;

  public conDimensiones(width: number, height: number): this {
    this.dimensiones = { width, height };
    return this;
  }

  public conEstanterias(estanterias: readonly Estanteria[]): this {
    this.estanterias = [...estanterias];
    return this;
  }

  public conMuelles(muelles: readonly Muelle[]): this {
    this.muelles = [...muelles];
    return this;
  }

  public conBasesCarga(bases: readonly BaseCarga[]): this {
    this.bases = [...bases];
    return this;
  }

  public construir(): Almacen {
    if (!this.dimensiones || !this.estanterias || !this.muelles || !this.bases) {
      throw new Error(
        'El almacén requiere dimensiones, estanterías, muelles y bases antes de construirse',
      );
    }
    return Almacen.construir({
      ...this.dimensiones,
      estanterias: this.estanterias,
      muelles: this.muelles,
      bases: this.bases,
    });
  }
}
