import { ReactNode } from 'react';
import { SimuladorState } from '../types';
import { getRobotVisualIdentity } from '../utils/robotVisualIdentity';
import './AlmacenGrid.css';

interface Props {
  estado: Pick<
    SimuladorState,
    'dimensiones' | 'robots' | 'camiones' | 'estanterias' | 'basesCarga'
  >;
}

const AlmacenGrid = ({ estado }: Props) => {
  const { dimensiones, robots, camiones, estanterias, basesCarga = [] } = estado;
  const { width, height } = dimensiones;

  const cells: ReactNode[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const robot = robots.find(item => item.x === x && item.y === y);
      const camion = camiones.find(item => item.x === x && item.y === y);
      const estante = estanterias.find(item => item.x === x && item.y === y);
      const baseCarga = basesCarga.find(item => item.x === x && item.y === y);

      let content: ReactNode = null;
      let className = 'celda';

      if (camion) {
        className += ` camion ${camion.tipo.toLowerCase()}`;
        content = <div className="camion-icon">🚛</div>;
      } else if (estante) {
        className += ' estante';
        content = (
          <div className="estante-content">
            {estante.paquetes.length > 0 ? <div className="paquete">📦</div> : <div className="estante-vacio"></div>}
          </div>
        );
      } else if (baseCarga) {
        className += ' base-carga';
        content = <div className="base-icon">⚡</div>;
      }

      const robotElement = robot && (
        <div
          className={`robot ${robot.estado.toLowerCase()}`}
          style={getRobotVisualIdentity(robot.id)}
        >
          🤖
          {robot.carga && <span className="robot-carga">📦</span>}
        </div>
      );

      cells.push(
        <div key={`${x}-${y}`} className={className}>
          {content}
          {robotElement}
        </div>
      );
    }
  }

  return (
    <div 
      className="almacen-grid" 
      style={{ 
        gridTemplateColumns: `repeat(${width}, 1fr)`,
        gridTemplateRows: `repeat(${height}, 1fr)`
      }}
    >
      {cells}
    </div>
  );
};

export default AlmacenGrid;
