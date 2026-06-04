import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

/** Forma de cada fila del CSV del almacén una vez parseada */
interface AlmacenRow {
  tipo: string;
  x: string;
  y: string;
  extra?: string;
}

/** Datos crudos del almacén extraídos del CSV, antes de instanciar entidades */
export interface RawAlmacenData {
  dimensiones: { width: number; height: number };
  estanterias: { x: number; y: number }[];
  muelles: { x: number; y: number; id: string }[];
  robots: { id: string; x: number; y: number; bateria: number; carga: null }[];
  basesCarga: { x: number; y: number; id: string }[];
}

/** Datos crudos de un camión extraídos del CSV */
export interface RawCamionData {
  id: string;
  tipo: 'RECEPCION' | 'DESPACHO';
  muelleId: string;
  tickLlegada: number;
}

/** Datos crudos de una orden extraídos del CSV */
export interface RawOrdenData {
  id: string;
  camionId: string;
  paqueteId: string;
  tipoPaquete: string;
  peso: number;
  vencimiento: string | null;
}

/**
 * Loader de datos de simulación desde archivos CSV.
 * Actúa como Fabricación Pura: centraliza la lectura y mapeo de datos sin
 * pertenecer al dominio del problema. Permite cambiar la fuente de datos
 * (CSV, JSON, BD) sin afectar las entidades de dominio.
 */
export class CSVLoader {
  static loadAlmacen(filePath: string): RawAlmacenData {
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const records = parse(rawData, { columns: true, skip_empty_lines: true }) as AlmacenRow[];

    let dimensiones = { width: 10, height: 10 };
    const estanterias: { x: number; y: number }[] = [];
    const muelles: { x: number; y: number; id: string }[] = [];
    const robots: { id: string; x: number; y: number; bateria: number; carga: null }[] = [];
    const basesCarga: { x: number; y: number; id: string }[] = [];

    for (const row of records) {
      if (row.tipo === 'dimensiones') {
        dimensiones = { width: parseInt(row.x), height: parseInt(row.y) };
      } else if (row.tipo === 'estanteria') {
        estanterias.push({ x: parseInt(row.x), y: parseInt(row.y) });
      } else if (row.tipo === 'muelle') {
        muelles.push({ x: parseInt(row.x), y: parseInt(row.y), id: row.extra ?? '' });
      } else if (row.tipo === 'robot') {
        robots.push({
          id: `R${robots.length + 1}`,
          x: parseInt(row.x),
          y: parseInt(row.y),
          bateria: row.extra ? parseInt(row.extra) : 100,
          carga: null,
        });
      } else if (row.tipo === 'base_carga') {
        basesCarga.push({ x: parseInt(row.x), y: parseInt(row.y), id: row.extra ?? '' });
      }
    }

    return { dimensiones, estanterias, muelles, robots, basesCarga } as unknown as RawAlmacenData;
  }

  static loadCamiones(filePath: string): RawCamionData[] {
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const records = parse(rawData, { columns: true, skip_empty_lines: true }) as {
      id_camion: string;
      tipo: string;
      muelle_id: string;
      tick_llegada: string;
    }[];

    return records.map(r => ({
      id: r.id_camion,
      tipo: r.tipo as 'RECEPCION' | 'DESPACHO',
      muelleId: r.muelle_id,
      tickLlegada: parseInt(r.tick_llegada),
    }));
  }

  static loadOrdenes(filePath: string): RawOrdenData[] {
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const records = parse(rawData, { columns: true, skip_empty_lines: true }) as {
      id_orden: string;
      id_camion: string;
      id_paquete: string;
      tipo_paquete: string;
      peso: string;
      vencimiento?: string;
    }[];

    return records.map(r => ({
      id: r.id_orden,
      camionId: r.id_camion,
      paqueteId: r.id_paquete,
      tipoPaquete: r.tipo_paquete,
      peso: parseFloat(r.peso),
      vencimiento: r.vencimiento || null,
    }));
  }
}

