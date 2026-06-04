/**
 * Interfaz Observer del patrón Observer.
 * Implementada por cualquier componente que desee reaccionar a cada tick de simulación
 * sin acoplarse al motor de dominio (Simulador).
 */
export interface TickObserver {
  /** Invocado por el Simulador al final de cada tick. */
  onTick(currentTick: number): void;
}

/**
 * Interfaz Subject del patrón Observer.
 * Implementada por el Simulador para gestionar la lista de observadores
 * y notificarlos sin conocer sus implementaciones concretas (DIP).
 */
export interface TickSubject {
  addObserver(observer: TickObserver): void;
  removeObserver(observer: TickObserver): void;
  notifyObservers(): void;
}

