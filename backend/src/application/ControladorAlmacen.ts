import { CamionDTO, MapaConfigDTO, RobotConfigDTO } from '../infrastructure/dtos';

/**
 * Controlador del Almacén.
 *
 * Es el sistema central del almacén. El SimuladorEntorno ya está implementado
 * y se comunicará con esta clase a través de los métodos públicos definidos abajo.
 *
 * Tu tarea es implementar la lógica interna: diseñar las entidades de dominio
 * (Robot, Almacen, Camion, Orden, etc.) y conectarlas aquí.
 */
export class ControladorAlmacen {

  /**
   * Llamado una vez al inicio de la simulación.
   * Recibe la configuración del mapa (estanterías, muelles, bases de carga)
   * y la lista de robots con su posición y batería inicial.
   * Usá estos datos para construir tu modelo interno del almacén.
   */
  public inicializar(mapaConfig: MapaConfigDTO, robotsConfig: RobotConfigDTO[]): void {
    // TODO
  }

  /**
   * Método ejecutado por el simulador en cada paso de tiempo (un tick).
   * Aquí debés coordinar el movimiento de los robots, la asignación de nuevas
   * órdenes y la liberación de camiones que hayan completado sus tareas.
   * 
   * Nota: Tener este método de forma pública y síncrona te facilitará enormemente
   * la escritura de pruebas unitarias (tests síncronos) sin depender de timers reales.
   */
  public procesarPaso(): void {
    // TODO
  }

  /**
   * Notificación del entorno: un camión físico llegó a un muelle.
   * El DTO contiene el id del camión, el tipo (RECEPCION o DESPACHO),
   * el muelle al que llegó, y la lista de órdenes que trae.
   *
   * Registrá el camión y sus órdenes en tu sistema para que los robots
   * puedan procesarlas.
   */
  public onCamionLlega(camionDTO: CamionDTO): void {
    // TODO
  }

  /**
   * Devuelve un snapshot del estado actual del almacén para la UI.
   * Para que la visualización del frontend funcione correctamente, debe retornar
   * un objeto con la siguiente estructura:
   * 
   * {
   *   dimensiones: { width: number; height: number };
   *   robots: Array<{
   *     x: number;
   *     y: number;
   *     estado: string;  // Ej: 'INACTIVO', 'MOVIMIENTO', 'CARGANDO' (insensible a mayúsculas/minúsculas)
   *     carga: boolean;   // true si transporta un paquete
   *   }>;
   *   camiones: Array<{
   *     x: number;
   *     y: number;
   *     tipo: 'RECEPCION' | 'DESPACHO';
   *   }>;
   *   estanterias: Array<{
   *     x: number;
   *     y: number;
   *     paquetes: Array<any>; // si contiene elementos se dibuja como ocupado con un paquete
   *   }>;
   *   basesCarga?: Array<{
   *     x: number;
   *     y: number;
   *   }>;
   * }
   */
  public obtenerEstado(): object {
    // TODO
    return {};
  }
}
