import {
  AlmacenBuilder,
  BaseCarga,
  Camion,
  ConflictoReservaError,
  Estanteria,
  EstrategiaNavegacion,
  Muelle,
  Orden,
  PaqueteComestible,
  PaqueteGeneral,
  Robot,
} from '../src/domain/model';
import { AStar, CalculadorRutas, MovimientoL } from '../src/domain/navigation';
import { RegistroRobots } from '../src/domain/registries/RegistroRobots';
import {
  AsignadorOrdenes,
  ControladorRobots,
  EjecutorRobotsPorTick,
  PriorizadorOrdenes,
} from '../src/application/services';
import { InicializadorSimulacion } from '../src/application/simulation/InicializadorSimulacion';

const crearAlmacen = (width = 4, height = 2) => new AlmacenBuilder()
  .conDimensiones(width, height)
  .conEstanterias([])
  .conMuelles([])
  .conBasesCarga([new BaseCarga(0, height - 1, 'B1')])
  .construir();

const crearCamion = (id = 'C1', tipo: 'RECEPCION' | 'DESPACHO' = 'RECEPCION') =>
  new Camion(id, tipo, 'M1', []);

describe('construcción y entidades de dominio', () => {
  test('el builder exige la configuración completa y al menos una base', () => {
    expect(() => new AlmacenBuilder()
      .conDimensiones(3, 3)
      .conEstanterias([])
      .conMuelles([])
      .construir()).toThrow(/requiere dimensiones/i);

    expect(() => new AlmacenBuilder()
      .conDimensiones(3, 3)
      .conEstanterias([])
      .conMuelles([])
      .conBasesCarga([])
      .construir()).toThrow(/al menos una base/i);
  });

  test('rechaza celdas superpuestas e identificadores de recursos duplicados', () => {
    expect(() => new AlmacenBuilder()
      .conDimensiones(3, 3)
      .conEstanterias([new Estanteria(1, 1)])
      .conMuelles([new Muelle(1, 1, 'M1')])
      .conBasesCarga([new BaseCarga(0, 0, 'B1')])
      .construir()).toThrow(/celda especial/i);

    expect(() => new AlmacenBuilder()
      .conDimensiones(3, 3)
      .conEstanterias([])
      .conMuelles([])
      .conBasesCarga([
        new BaseCarga(0, 0, 'B1'),
        new BaseCarga(2, 2, 'B1'),
      ])
      .construir()).toThrow(/Base duplicada/);
  });

  test('las bases de carga no admiten reservas', () => {
    const almacen = crearAlmacen();
    expect(() => almacen.reservar({ x: 0, y: 1 }, 'R1')).toThrow(/no admite reservas/);
  });

  test('la orden conserva la referencia al camión de origen', () => {
    const camion = crearCamion();
    const orden = new Orden('O1', camion, new PaqueteGeneral(null, 'P1', 10));
    expect(orden.camion).toBe(camion);
    expect(orden.camionId).toBe('C1');
    expect(orden.tipoCamion).toBe('RECEPCION');
  });

  test('prioriza comestibles por FEFO y generales por peso', () => {
    const camion = crearCamion();
    const ordenes = [
      new Orden('G-LIVIANO', camion, new PaqueteGeneral(null, 'P1', 10)),
      new Orden(
        'C-TARDE',
        camion,
        new PaqueteComestible(null, 'P2', 5, new Date('2027-01-01')),
      ),
      new Orden('G-PESADO', camion, new PaqueteGeneral(null, 'P3', 90)),
      new Orden(
        'C-TEMPRANO',
        camion,
        new PaqueteComestible(null, 'P4', 5, new Date('2026-01-01')),
      ),
    ];
    expect(new PriorizadorOrdenes().priorizar(ordenes).map(orden => orden.id)).toEqual([
      'C-TEMPRANO',
      'C-TARDE',
      'G-PESADO',
      'G-LIVIANO',
    ]);
  });
});

describe('ocupación, movimiento y navegación', () => {
  test('mueve ocupación atómicamente, consume batería y no consume al bloquearse', () => {
    const almacen = crearAlmacen();
    const registro = new RegistroRobots(almacen);
    const robot = new Robot('R1', 0, 0, 10);
    const bloqueador = new Robot('R2', 2, 0, 10);
    registro.registrar(robot);
    registro.registrar(bloqueador);

    robot.registrarBloqueo();
    robot.asignarRuta([{ x: 1, y: 0 }, { x: 2, y: 0 }]);
    expect(robot.ejecutarSiguienteMovimiento({
      intentarMover: (desde, hasta) => almacen.moverOcupacion(desde, hasta),
    }).tipo).toBe('MOVIMIENTO_REALIZADO');
    expect(robot.getPosicion()).toEqual({ x: 1, y: 0 });
    expect(robot.getBateria()).toBe(9);
    expect(robot.getBloqueos()).toBe(0);
    expect(almacen.estaOcupada({ x: 0, y: 0 })).toBe(false);
    expect(almacen.estaOcupada({ x: 1, y: 0 })).toBe(true);

    expect(robot.ejecutarSiguienteMovimiento({
      intentarMover: (desde, hasta) => almacen.moverOcupacion(desde, hasta),
    }).tipo).toBe('MOVIMIENTO_BLOQUEADO');
    expect(robot.getBateria()).toBe(9);
  });

  test('consume dos unidades al moverse con carga', () => {
    const almacen = crearAlmacen();
    const registro = new RegistroRobots(almacen);
    const robot = new Robot('R1', 0, 0, 10);
    registro.registrar(robot);
    robot.cargar(new PaqueteGeneral('P1', 'P1', 1));
    robot.asignarRuta([{ x: 1, y: 0 }]);
    robot.ejecutarSiguienteMovimiento({
      intentarMover: (desde, hasta) => almacen.moverOcupacion(desde, hasta),
    });
    expect(robot.getBateria()).toBe(8);
  });

  test('el ejecutor procesa por id y evita la superposición', () => {
    const almacen = crearAlmacen(3, 2);
    const registro = new RegistroRobots(almacen);
    const r2 = new Robot('R2', 2, 0, 10);
    const r1 = new Robot('R1', 0, 0, 10);
    registro.registrar(r2);
    registro.registrar(r1);
    r1.asignarRuta([{ x: 1, y: 0 }]);
    r2.asignarRuta([{ x: 1, y: 0 }]);
    const controlador = new ControladorRobots(registro);

    const resultados = new EjecutorRobotsPorTick(almacen, controlador).ejecutar();
    expect(resultados.map(resultado => [resultado.robot.id, resultado.tipo])).toEqual([
      ['R1', 'MOVIMIENTO_REALIZADO'],
      ['R2', 'MOVIMIENTO_BLOQUEADO'],
    ]);
  });

  test('distingue estar en destino, una ruta y la ausencia de camino', () => {
    const almacen = crearAlmacen(3, 3);
    expect(new MovimientoL().calcular(
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      almacen,
    )).toEqual({ tipo: 'EN_DESTINO' });
    expect(new CalculadorRutas().calcular(
      EstrategiaNavegacion.MOVIMIENTO_L,
      { x: 0, y: 0 },
      { x: 2, y: 1 },
      almacen,
    )).toMatchObject({ tipo: 'RUTA' });

    almacen.ocupar({ x: 1, y: 0 });
    almacen.ocupar({ x: 1, y: 1 });
    almacen.ocupar({ x: 1, y: 2 });
    expect(new AStar().calcular(
      { x: 0, y: 1 },
      { x: 2, y: 1 },
      almacen,
    )).toEqual({ tipo: 'SIN_CAMINO' });
  });

  test('al tercer bloqueo el orquestador cambia la estrategia', () => {
    const contexto = new InicializadorSimulacion().inicializar({
      dimensiones: { width: 3, height: 2 },
      estanterias: [],
      muelles: [],
      basesCarga: [{ x: 0, y: 1, id: 'B1' }],
    }, [{ id: 'R1', x: 0, y: 0, bateria: 10 }]);
    const robot = contexto.robots.get('R1');
    const bloqueo = {
      tipo: 'MOVIMIENTO_BLOQUEADO' as const,
      robot,
      destino: { x: 1, y: 0 },
    };

    contexto.orquestadorRobots.procesarResultados([bloqueo, bloqueo, bloqueo]);
    expect(robot.getEstrategia()).toBe(EstrategiaNavegacion.A_STAR);
    expect(robot.getBloqueos()).toBe(0);
  });
});

describe('coordinación transaccional', () => {
  test('revierte la primera reserva si la segunda entra en conflicto', () => {
    const almacen = new AlmacenBuilder()
      .conDimensiones(4, 2)
      .conEstanterias([new Estanteria(3, 0)])
      .conMuelles([new Muelle(0, 0, 'M1')])
      .conBasesCarga([new BaseCarga(0, 1, 'B1')])
      .construir();
    const registro = new RegistroRobots(almacen);
    const robot = new Robot('R1', 1, 0, 100);
    registro.registrar(robot);
    const controlador = new ControladorRobots(registro);
    const camion = crearCamion();
    camion.acoplar(0);
    almacen.getMuelle('M1').acoplar(camion);
    const orden = new Orden('O1', camion, new PaqueteGeneral(null, 'P1', 1));
    const asignador = new AsignadorOrdenes(almacen, registro, controlador);

    const reservarReal = almacen.reservar.bind(almacen);
    let invocaciones = 0;
    jest.spyOn(almacen, 'reservar').mockImplementation((posicion, robotId) => {
      invocaciones += 1;
      if (invocaciones === 2) throw new ConflictoReservaError('Conflicto simulado');
      reservarReal(posicion, robotId);
    });

    asignador.asignar([orden]);

    expect(almacen.getMuelle('M1').getReserva()).toBeNull();
    expect(almacen.getEstanterias()[0].getReserva()).toBeNull();
    expect(orden.estaAsignada()).toBe(false);
    expect(controlador.estaDisponible(robot)).toBe(true);
  });
});
