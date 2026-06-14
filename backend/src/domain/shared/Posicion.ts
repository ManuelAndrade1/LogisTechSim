export interface Posicion {
  readonly x: number;
  readonly y: number;
}

export const posicionKey = ({ x, y }: Posicion): string => `${x},${y}`;

export const mismaPosicion = (a: Posicion, b: Posicion): boolean =>
  a.x === b.x && a.y === b.y;

export const distanciaManhattan = (a: Posicion, b: Posicion): number =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
