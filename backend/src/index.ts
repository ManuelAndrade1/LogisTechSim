import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { SimuladorEntorno } from './infrastructure/SimuladorEntorno';
import { LoggerObserver } from './infrastructure/observers/LoggerObserver';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Instancia global del entorno de simulación
const dataBasePath = path.resolve(__dirname, '../data');
const entorno = new SimuladorEntorno(dataBasePath);
entorno.init('sim1');

// Registrar observadores (patrón Observer activo en producción)
entorno.addObserver(new LoggerObserver());

// Endpoint para listar simulaciones disponibles (subcarpetas de /data)
app.get('/api/simulaciones', (_req: Request, res: Response) => {
  const dataPath = path.resolve(__dirname, '../data');
  try {
    const sims = fs.readdirSync(dataPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .sort();
    res.json({ simulaciones: sims });
  } catch {
    res.json({ simulaciones: [] });
  }
});

// Endpoint para resetear y opcionalmente cambiar simulación
app.post('/api/restart', (req: Request, res: Response) => {
  const { sim } = req.body as { sim?: string };
  entorno.reset(sim);
  res.json({ message: 'Simulación reiniciada', estado: entorno.getEstadoActual() });
});

// Endpoint para consultar el estado actual (Polling desde el Frontend)
app.get('/api/estado', (_req: Request, res: Response) => {
  res.json(entorno.getEstadoActual());
});

// Endpoint para avanzar el tiempo de la simulación manualmente (un tick)
app.post('/api/simular/tick', (_req: Request, res: Response) => {
  entorno.avanzarTick();
  res.json({ message: 'Tick avanzado exitosamente', tickActual: entorno.getTickActual() });
});

app.listen(PORT, () => {
  console.log(`Server LogisTech Sim is running on http://localhost:${PORT}`);
});

