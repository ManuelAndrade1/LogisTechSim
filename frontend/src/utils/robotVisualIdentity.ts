import type { CSSProperties } from 'react';

type RobotVisualProperty =
  | '--robot-color'
  | '--robot-glow'
  | '--robot-bg'
  | '--robot-border';

export type RobotVisualIdentity = CSSProperties & Record<RobotVisualProperty, string>;

const ROBOT_PALETTE = [
  { color: '#22d3ee', rgb: '34, 211, 238' },
  { color: '#4ade80', rgb: '74, 222, 128' },
  { color: '#facc15', rgb: '250, 204, 21' },
  { color: '#fb923c', rgb: '251, 146, 60' },
  { color: '#f472b6', rgb: '244, 114, 182' },
  { color: '#38bdf8', rgb: '56, 189, 248' },
  { color: '#2dd4bf', rgb: '45, 212, 191' },
  { color: '#f87171', rgb: '248, 113, 113' },
  { color: '#a3e635', rgb: '163, 230, 53' },
  { color: '#c084fc', rgb: '192, 132, 252' },
];

const hashRobotId = (robotId: string): number =>
  [...robotId].reduce((hash, char) => hash * 31 + char.charCodeAt(0), 0);

const getPaletteIndex = (robotId: string): number => {
  const numericId = robotId.match(/\d+/)?.[0];
  const identityNumber = numericId ? Number.parseInt(numericId, 10) - 1 : hashRobotId(robotId);

  return Math.abs(identityNumber) % ROBOT_PALETTE.length;
};

export const getRobotVisualIdentity = (robotId: string): RobotVisualIdentity => {
  const { color, rgb } = ROBOT_PALETTE[getPaletteIndex(robotId)];

  return {
    '--robot-color': color,
    '--robot-glow': `rgba(${rgb}, 0.68)`,
    '--robot-bg': `rgba(${rgb}, 0.13)`,
    '--robot-border': `rgba(${rgb}, 0.76)`,
  };
};
