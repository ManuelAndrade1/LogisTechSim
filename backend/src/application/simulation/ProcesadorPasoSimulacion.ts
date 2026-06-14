import { ContextoSimulacion } from './ContextoSimulacion';

export class ProcesadorPasoSimulacion {
  public procesar(contexto: ContextoSimulacion, tick: number): void {
    contexto.procesadorManifiestos.procesarHabilitados(tick);
    const ordenes = contexto.orquestadorOrdenes.obtenerPendientesPriorizadas();
    contexto.asignadorOrdenes.asignar(ordenes);
    contexto.orquestadorRobots.prepararActividades();

    const resultados = contexto.ejecutorRobots.ejecutar();
    contexto.orquestadorRobots.procesarResultados(resultados);
    const robotsCompletados = contexto.gestorTransferencias.procesar(resultados);
    contexto.orquestadorRobots.asignarRutasPostOrden(robotsCompletados);
    contexto.gestorRecarga.procesar(resultados);
    contexto.retiradorCamiones.procesar(tick);
  }
}
