import { Battery, Bot, ClipboardCheck, Package } from 'lucide-react';
import { RobotState } from '../types';
import './SidePanels.css';

interface Props {
  robots: RobotState[];
}

const claseEstado = (estado: string): string =>
  estado.toLowerCase().replace(/_/g, '-');

const claseBateria = (bateria: number): string => {
  if (bateria <= 20) return 'battery-low';
  if (bateria <= 50) return 'battery-medium';
  return 'battery-high';
};

const RobotsPanel = ({ robots }: Props) => (
  <aside className="side-panel robots-panel">
    <div className="panel-header">
      <div className="panel-title">
        <Bot size={18} />
        <h2>Robots</h2>
      </div>
      <span className="panel-count">{robots.length}</span>
    </div>

    <div className="panel-list">
      {robots.map(robot => (
        <article className="data-card robot-card" key={robot.id}>
          <div className="card-heading">
            <strong>{robot.id}</strong>
            <span className={`status-badge status-${claseEstado(robot.estado)}`}>
              {robot.estado.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="robot-assignment">
            <div className="card-line">
              <ClipboardCheck size={14} />
              <span>{robot.ordenId ? `Orden ${robot.ordenId}` : 'Sin orden'}</span>
            </div>
            <div className="card-line">
              <Package size={14} />
              <span>{robot.paqueteId ? `Paquete ${robot.paqueteId}` : 'Sin carga'}</span>
            </div>
          </div>

          <div className="battery-block">
            <div className="battery-label">
              <span><Battery size={14} /> Batería</span>
              <strong>{robot.bateria}%</strong>
            </div>
            <div className="battery-track">
              <div
                className={`battery-fill ${claseBateria(robot.bateria)}`}
                style={{ width: `${robot.bateria}%` }}
              />
            </div>
          </div>
        </article>
      ))}
    </div>
  </aside>
);

export default RobotsPanel;
