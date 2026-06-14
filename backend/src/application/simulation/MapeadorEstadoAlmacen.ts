import { EstadoAlmacenDTO } from '../contracts/dtos';
import { ContextoSimulacion } from './ContextoSimulacion';

export class MapeadorEstadoAlmacen {
  public mapear(contexto: ContextoSimulacion): EstadoAlmacenDTO {
    const { almacen, robots, controladorRobots, orquestadorOrdenes } = contexto;
    return {
      dimensiones: { width: almacen.width, height: almacen.height },
      robots: robots.getTodos().map(robot => {
        const actividad = controladorRobots.getContexto(robot);
        return {
          id: robot.id,
          ...robot.getPosicion(),
          estado: robot.getEstado(),
          carga: robot.getCarga() !== null,
          bateria: robot.getBateria(),
          ordenId: actividad.orden?.id ?? null,
          paqueteId: robot.getCarga()?.idPlanificado ?? null,
        };
      }),
      ordenes: orquestadorOrdenes.obtenerTodasPriorizadas().map(orden => {
        const paquete = orden.getPaquete();
        return {
          id: orden.id,
          camionId: orden.camion.id,
          tipoCamion: orden.camion.tipo,
          estado: orden.getEstado(),
          robotId: orden.getRobotId(),
          paqueteId: paquete.idPlanificado,
          tipoPaquete: paquete.tipo,
          peso: paquete.peso,
          vencimiento: paquete.getVencimiento()?.toISOString() ?? null,
        };
      }),
      camiones: almacen.getMuelles().flatMap(muelle => {
        const camion = muelle.getCamion();
        return camion ? [{ x: muelle.x, y: muelle.y, tipo: camion.tipo }] : [];
      }),
      estanterias: almacen.getEstanterias().map(estanteria => {
        const paquete = estanteria.getPaquete();
        return {
          x: estanteria.x,
          y: estanteria.y,
          paquetes: paquete ? [{
            id: paquete.getId(),
            tipo: paquete.tipo,
            peso: paquete.peso,
            vencimiento: paquete.getVencimiento()?.toISOString() ?? null,
          }] : [],
        };
      }),
      basesCarga: almacen.getBases().map(base => ({ x: base.x, y: base.y })),
    };
  }
}
