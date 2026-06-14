import {
  Almacen,
  BaseCarga,
  EstrategiaNavegacion,
  Muelle,
  Orden,
  PaqueteComestible,
  PaqueteGeneral,
  Robot,
} from '../src/domain/model';
import { RelojAlmacen } from '../src/domain/RelojAlmacen';
import { PlanificadorRutas } from '../src/domain/navigation';
import {
  GestorRecarga,
  OrquestadorRobots,
  PriorizadorOrdenes,
} from '../src/application/services';

describe('reglas de dominio', () => {
  test('prioriza comestibles por FEFO y generales por peso', () => {
    const ordenes = [
      new Orden('G-LIVIANO', 'C1', 'RECEPCION', new PaqueteGeneral(null, 'P1', 10)),
      new Orden('C-TARDE', 'C1', 'RECEPCION',
        new PaqueteComestible(null, 'P2', 5, new Date('2027-01-01'))),
      new Orden('G-PESADO', 'C1', 'RECEPCION', new PaqueteGeneral(null, 'P3', 90)),
      new Orden('C-TEMPRANO', 'C1', 'RECEPCION',
        new PaqueteComestible(null, 'P4', 5, new Date('2026-01-01'))),
    ];

    expect(new PriorizadorOrdenes().priorizar(ordenes).map(orden => orden.id)).toEqual([
      'C-TEMPRANO',
      'C-TARDE',
      'G-PESADO',
      'G-LIVIANO',
    ]);
  });

  test('el robot mueve una celda, consume batería y reinicia los bloqueos', () => {
    const robot = new Robot('R1', 0, 0, 10);
    robot.registrarBloqueo();
    robot.registrarBloqueo();
    robot.asignarRuta([{ x: 1, y: 0 }]);

    const resultado = robot.ejecutarTick({ puedeOcupar: () => true });

    expect(resultado.tipo).toBe('MOVIMIENTO_REALIZADO');
    expect(robot.getPosicion()).toEqual({ x: 1, y: 0 });
    expect(robot.getBateria()).toBe(9);
    expect(robot.getBloqueos()).toBe(0);
  });

  test('el reloj notifica por id y el primer robot ocupa la celda disputada', () => {
    const almacen = new Almacen(3, 1);
    const r2 = new Robot('R2', 2, 0, 10);
    const r1 = new Robot('R1', 0, 0, 10);
    almacen.agregarRobot(r2);
    almacen.agregarRobot(r1);
    r1.asignarRuta([{ x: 1, y: 0 }]);
    r2.asignarRuta([{ x: 1, y: 0 }]);

    const reloj = new RelojAlmacen();
    reloj.registrar(r2);
    reloj.registrar(r1);
    const resultados = reloj.notificar({
      puedeOcupar: (posicion, robotId) => !almacen.estaOcupada(posicion, robotId),
    });

    expect(resultados.map(resultado => [resultado.robot.id, resultado.tipo])).toEqual([
      ['R1', 'MOVIMIENTO_REALIZADO'],
      ['R2', 'MOVIMIENTO_BLOQUEADO'],
    ]);
    expect(r1.getPosicion()).toEqual({ x: 1, y: 0 });
    expect(r2.getPosicion()).toEqual({ x: 2, y: 0 });
  });

  test('al tercer bloqueo el orquestador cambia la estrategia y reinicia el contador', () => {
    const almacen = new Almacen(2, 1);
    const robot = new Robot('R1', 0, 0, 10);
    almacen.agregarRobot(robot);
    const orquestador = new OrquestadorRobots(
      almacen,
      new PlanificadorRutas(),
      new GestorRecarga(almacen),
    );
    const bloqueo = {
      tipo: 'MOVIMIENTO_BLOQUEADO' as const,
      robot,
      destino: { x: 1, y: 0 },
    };

    orquestador.procesarResultados([bloqueo]);
    orquestador.procesarResultados([bloqueo]);
    expect(robot.getBloqueos()).toBe(2);
    orquestador.procesarResultados([bloqueo]);

    expect(robot.getEstrategia()).toBe(EstrategiaNavegacion.A_STAR);
    expect(robot.getBloqueos()).toBe(0);
  });

  test('una nueva orden interrumpe y reemplaza una ruta de despeje', () => {
    const robot = new Robot('R1', 0, 0, 10);
    const ordenCompletada = new Orden(
      'O1',
      'C1',
      'RECEPCION',
      new PaqueteGeneral(null, 'P1', 10),
    );
    robot.asignarOrden(ordenCompletada);
    robot.completarOrden();
    robot.iniciarDespeje({ x: 1, y: 0 }, [{ x: 1, y: 0 }]);

    const nuevaOrden = new Orden(
      'O2',
      'C2',
      'RECEPCION',
      new PaqueteGeneral(null, 'P2', 10),
    );
    robot.asignarOrden(nuevaOrden);

    expect(robot.necesitaDespejar()).toBe(false);
    expect(robot.getDestinoDespeje()).toBeNull();
    expect(robot.tieneRuta()).toBe(false);
    expect(robot.getOrden()).toBe(nuevaOrden);
  });

  test('reelige el pasillo libre más cercano cuando el destino queda ocupado', () => {
    const almacen = new Almacen(4, 1);
    almacen.agregarMuelle(new Muelle(0, 0, 'M1'));
    const robot = new Robot('R1', 0, 0, 10);
    const ocupante = new Robot('R2', 3, 0, 10);
    almacen.agregarRobot(robot);
    almacen.agregarRobot(ocupante);
    const orquestador = new OrquestadorRobots(
      almacen,
      new PlanificadorRutas(),
      new GestorRecarga(almacen),
    );
    const orden = new Orden('O1', 'C1', 'RECEPCION', new PaqueteGeneral(null, 'P1', 1));
    robot.asignarOrden(orden);
    robot.completarOrden();

    orquestador.asignarRutasPostOrden([robot]);
    expect(robot.getDestinoDespeje()).toEqual({ x: 1, y: 0 });

    ocupante.asignarRuta([{ x: 2, y: 0 }, { x: 1, y: 0 }]);
    ocupante.ejecutarTick({ puedeOcupar: () => true });
    ocupante.ejecutarTick({ puedeOcupar: () => true });
    orquestador.prepararActividades();

    expect(robot.getDestinoDespeje()).toEqual({ x: 2, y: 0 });
  });

  test('reintenta asignar despeje cuando inicialmente no hay pasillos libres', () => {
    const almacen = new Almacen(3, 2);
    almacen.agregarMuelle(new Muelle(0, 0, 'M1'));
    almacen.agregarBase(new BaseCarga(0, 1, 'B1'));
    const robot = new Robot('R1', 0, 0, 10);
    const bloqueadores = [
      new Robot('R2', 1, 0, 10),
      new Robot('R3', 2, 0, 10),
      new Robot('R4', 1, 1, 10),
      new Robot('R5', 2, 1, 10),
    ];
    almacen.agregarRobot(robot);
    for (const bloqueador of bloqueadores) almacen.agregarRobot(bloqueador);
    const orquestador = new OrquestadorRobots(
      almacen,
      new PlanificadorRutas(),
      new GestorRecarga(almacen),
    );
    const orden = new Orden('O1', 'C1', 'RECEPCION', new PaqueteGeneral(null, 'P1', 1));
    robot.asignarOrden(orden);
    robot.completarOrden();

    orquestador.asignarRutasPostOrden([robot]);
    expect(robot.getDestinoDespeje()).toBeNull();
    expect(robot.necesitaDespejar()).toBe(true);

    bloqueadores[2].asignarRuta([{ x: 0, y: 1 }]);
    bloqueadores[2].ejecutarTick({ puedeOcupar: () => true });
    orquestador.prepararActividades();

    expect(robot.getDestinoDespeje()).toEqual({ x: 1, y: 1 });
    expect(robot.tieneRuta()).toBe(true);
  });
});
