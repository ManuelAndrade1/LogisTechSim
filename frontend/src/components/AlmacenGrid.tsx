import React from 'react';
import './AlmacenGrid.css';

interface Props {
  estado: any;
}

const AlmacenGrid: React.FC<Props> = ({ estado }) => {
  const { dimensiones, robots, camiones, estanterias, basesCarga = [] } = estado;
  if (!dimensiones) return null;

  const { width, height } = dimensiones;

  // Creamos la matriz de celdas
  const cells = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Buscar qué hay en esta celda
      const robot = robots.find((r: any) => r.x === x && r.y === y);
      const camion = camiones.find((c: any) => c.x === x && c.y === y);
      const estante = estanterias.find((e: any) => e.x === x && e.y === y);
      const baseCarga = basesCarga.find((b: any) => b.x === x && b.y === y);

      let content = null;
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

      // El robot puede flotar sobre pasillos u otros lugares
      const robotElement = robot && (
        <div className={`robot ${robot.estado.toLowerCase()}`}>
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
