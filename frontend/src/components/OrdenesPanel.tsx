import { ClipboardList, Package, Truck } from 'lucide-react';
import { OrdenState } from '../types';
import './SidePanels.css';

interface Props {
  ordenes: OrdenState[];
}

type EstadoVisual = 'PENDIENTE' | 'ASIGNADA' | 'COMPLETADA';

const obtenerEstadoVisual = (orden: OrdenState): EstadoVisual => {
  if (orden.estado === 'COMPLETADA') return 'COMPLETADA';
  return orden.robotId ? 'ASIGNADA' : 'PENDIENTE';
};

const formatearVencimiento = (vencimiento: string): string =>
  new Date(vencimiento).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });

const OrdenesPanel = ({ ordenes }: Props) => (
  <aside className="side-panel orders-panel">
    <div className="panel-header">
      <div className="panel-title">
        <ClipboardList size={18} />
        <h2>Órdenes</h2>
      </div>
      <span className="panel-count">{ordenes.length}</span>
    </div>

    <div className="panel-list">
      {ordenes.length === 0 ? (
        <div className="panel-empty">Todavía no hay órdenes registradas.</div>
      ) : ordenes.map(orden => {
        const estadoVisual = obtenerEstadoVisual(orden);
        return (
          <article className="data-card order-card" key={orden.id}>
            <div className="card-heading">
              <strong>{orden.id}</strong>
              <span className={`status-badge status-${estadoVisual.toLowerCase()}`}>
                {estadoVisual}
              </span>
            </div>

            <div className="card-line">
              <Truck size={14} />
              <span>{orden.camionId}</span>
              <span className={`type-chip type-${orden.tipoCamion.toLowerCase()}`}>
                {orden.tipoCamion}
              </span>
            </div>

            <div className="card-line">
              <Package size={14} />
              <span>{orden.paqueteId}</span>
              <span>{orden.tipoPaquete}</span>
            </div>

            <dl className="card-details">
              <div>
                <dt>Peso</dt>
                <dd>{orden.peso} kg</dd>
              </div>
              <div>
                <dt>Robot</dt>
                <dd>{orden.robotId ?? '—'}</dd>
              </div>
              {orden.tipoPaquete === 'COMESTIBLE' && (
                <div className="detail-wide">
                  <dt>Vencimiento</dt>
                  <dd>{orden.vencimiento ? formatearVencimiento(orden.vencimiento) : '—'}</dd>
                </div>
              )}
            </dl>
          </article>
        );
      })}
    </div>
  </aside>
);

export default OrdenesPanel;
