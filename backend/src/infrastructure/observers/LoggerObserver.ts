import { TickObserver } from '../../domain/interfaces/TickObserver';

/**
 * Observador concreto que registra métricas de la simulación por tick.
 * Demuestra el patrón Observer en producción: el Simulador (alto nivel)
 * notifica sin conocer los detalles de este logger (bajo nivel), cumpliendo DIP.
 */
export class LoggerObserver implements TickObserver {
  private readonly startTime: Date;
  private ticksProcesados: number = 0;

  constructor() {
    this.startTime = new Date();
    console.log(`[LoggerObserver] Observador registrado a las ${this.startTime.toISOString()}`);
  }

  onTick(currentTick: number): void {
    this.ticksProcesados++;
    const elapsed = ((Date.now() - this.startTime.getTime()) / 1000).toFixed(1);
    console.log(
      `[LoggerObserver] tick=${currentTick} | procesados=${this.ticksProcesados} | tiempo_activo=${elapsed}s`
    );
  }
}

