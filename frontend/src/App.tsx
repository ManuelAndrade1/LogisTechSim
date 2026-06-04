import { useEffect, useState, useRef } from 'react';
import { Play, Pause, FastForward, RotateCcw, ChevronDown } from 'lucide-react';
import AlmacenGrid from './components/AlmacenGrid';

interface SimuladorState {
  tick: number;
  robots: any[];
  camiones: any[];
  estanterias: any[];
  dimensiones?: { width: number; height: number };
}

function App() {
  const [estado, setEstado] = useState<SimuladorState | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [simulaciones, setSimulaciones] = useState<string[]>([]);
  const [simSeleccionada, setSimSeleccionada] = useState<string>('sim1');
  const autoPlayRef = useRef(autoPlay);
  autoPlayRef.current = autoPlay;

  const fetchEstado = async () => {
    try {
      const res = await fetch('/api/estado');
      if (res.ok) setEstado(await res.json());
    } catch (e) {
      console.error('Error fetching estado', e);
    }
  };

  const fetchSimulaciones = async () => {
    try {
      const res = await fetch('/api/simulaciones');
      if (res.ok) {
        const data = await res.json();
        setSimulaciones(data.simulaciones ?? []);
      }
    } catch {}
  };

  const avanzarTick = async () => {
    try {
      const res = await fetch('/api/simular/tick', { method: 'POST' });
      if (res.ok) fetchEstado();
    } catch (e) {
      console.error('Error advancing tick', e);
    }
  };

  const restart = async (sim?: string) => {
    setAutoPlay(false);
    try {
      const res = await fetch('/api/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sim: sim ?? simSeleccionada }),
      });
      if (res.ok) {
        const data = await res.json();
        setEstado(data.estado);
      }
    } catch (e) {
      console.error('Error restarting', e);
    }
  };

  const handleSimChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sim = e.target.value;
    setSimSeleccionada(sim);
    await restart(sim);
  };

  useEffect(() => {
    fetchSimulaciones();
    fetchEstado();
  }, []);

  useEffect(() => {
    let interval: number;
    if (autoPlay) {
      interval = window.setInterval(() => avanzarTick(), 800);
    }
    return () => clearInterval(interval);
  }, [autoPlay]);

  return (
    <div className="app-container">
      <header className="header">
        <h1>
          LogisTech Sim <span className="tick-badge">Tick: {estado?.tick ?? 0}</span>
        </h1>
        <div className="controls">
          {/* Dropdown selector de simulación */}
          <div className="sim-selector">
            <ChevronDown size={14} />
            <select
              value={simSeleccionada}
              onChange={handleSimChange}
              className="sim-select"
            >
              {simulaciones.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <button onClick={() => restart()} className="btn btn-danger">
            <RotateCcw size={16} /> Reiniciar
          </button>
          <button onClick={avanzarTick} className="btn">
            <FastForward size={16} /> Avanzar Tick
          </button>
          <button
            onClick={() => setAutoPlay(!autoPlay)}
            className={`btn ${autoPlay ? 'btn-active' : ''}`}
          >
            {autoPlay ? <Pause size={16} /> : <Play size={16} />}
            {autoPlay ? 'Pausar' : 'Auto-Play'}
          </button>
        </div>
      </header>

      <main className="main-content">
        {!estado ? (
          <div className="loading">Cargando estado del simulador...</div>
        ) : (
          <AlmacenGrid estado={estado} />
        )}
      </main>
    </div>
  );
}

export default App;
