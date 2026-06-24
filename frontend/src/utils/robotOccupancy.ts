import { RobotState } from '../types';

export const robotPositionKey = (x: number, y: number) => `${x},${y}`;

export const crearIndiceOcupacionRobots = (robots: readonly RobotState[]) => {
  const indice = new Map<string, RobotState[]>();

  for (const robot of robots) {
    const key = robotPositionKey(robot.x, robot.y);
    const ocupantes = indice.get(key) ?? [];
    ocupantes.push(robot);
    indice.set(key, ocupantes);
  }

  return indice;
};
