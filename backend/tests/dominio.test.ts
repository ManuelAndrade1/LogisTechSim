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
  AsignadorRutas,
  ControladorRobots,
  EjecutorRobotsPorTick,
  GestorDespeje,
  GestorRecarga,
  PoliticaBateria,
  PriorizadorOrdenes,
  SelectorDestinoCesionAleatorio,
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

  test('al tercer bloqueo con destino ocupado asigna una cesión puntual', () => {
    const contexto = new InicializadorSimulacion().inicializar({
      dimensiones: { width: 4, height: 3 },
      estanterias: [],
      muelles: [],
      basesCarga: [{ x: 0, y: 2, id: 'B1' }],
    }, [
      { id: 'R1', x: 0, y: 0, bateria: 10 },
      { id: 'R2', x: 1, y: 0, bateria: 10 },
    ]);
    const robot = contexto.robots.get('R1');
    const bloqueo = {
      tipo: 'MOVIMIENTO_BLOQUEADO' as const,
      robot,
      destino: { x: 1, y: 0 },
    };

    contexto.orquestadorRobots.procesarResultados([bloqueo, bloqueo, bloqueo]);

    expect(robot.getEstrategia()).toBe(EstrategiaNavegacion.A_STAR);
    expect(robot.getBloqueos()).toBe(0);
    expect(robot.getSiguientePaso()).not.toBeNull();
  });

  test('el selector de cesión usa un generador aleatorio inyectable', () => {
    const almacen = crearAlmacen(4, 3);
    const robot = new Robot('R1', 0, 0, 10);
    const selector = new SelectorDestinoCesionAleatorio({ siguiente: () => 0.75 });

    const destino = selector.seleccionar(robot, almacen.getPasillosLibres());

    expect(destino?.posicion).toEqual({ x: 3, y: 0 });
  });

  test('la política de batería acepta autonomía exacta y rechaza solo más de 100', () => {
    const almacen = crearAlmacen();
    const camion = crearCamion();
    const orden = new Orden('O1', camion, new PaqueteGeneral(null, 'P1', 1));
    orden.asignar('R1', { x: 0, y: 0 }, { x: 1, y: 0 });
    const robot = new Robot('R1', 0, 0, 100);
    const politicaConEnergia = (energia: number) => new PoliticaBateria(almacen, {
      estimar: () => energia,
    });

    expect(politicaConEnergia(99).debeRecargarParaOrden(robot, orden, 'HACIA_ORIGEN'))
      .toBe(false);
    expect(politicaConEnergia(100).debeRecargarParaOrden(robot, orden, 'HACIA_ORIGEN'))
      .toBe(false);
    expect(() => politicaConEnergia(101).debeRecargarParaOrden(robot, orden, 'HACIA_ORIGEN'))
      .toThrow(/supera la autonomía máxima/);
  });

  test('la política de batería usa costo de ruta real y no Manhattan para órdenes', () => {
    const almacen = new AlmacenBuilder()
      .conDimensiones(3, 2)
      .conEstanterias([])
      .conMuelles([])
      .conBasesCarga([new BaseCarga(2, 0, 'B1')])
      .construir();
    almacen.ocupar({ x: 1, y: 0 });
    const camion = crearCamion();
    const orden = new Orden('O1', camion, new PaqueteGeneral(null, 'P1', 1));
    orden.asignar('R1', { x: 0, y: 0 }, { x: 0, y: 0 });
    const robot = new Robot('R1', 0, 0, 2);

    expect(new PoliticaBateria(almacen).debeRecargarParaOrden(robot, orden, 'HACIA_DESTINO'))
      .toBe(true);
  });

  test('el gestor de recarga elige la base con menor costo efectivo', () => {
    const almacen = new AlmacenBuilder()
      .conDimensiones(4, 4)
      .conEstanterias([])
      .conMuelles([])
      .conBasesCarga([
        new BaseCarga(2, 0, 'B1'),
        new BaseCarga(0, 3, 'B2'),
      ])
      .construir();
    const registro = new RegistroRobots(almacen);
    const robot = new Robot('R1', 0, 0, 10);
    registro.registrar(robot);
    almacen.ocupar({ x: 1, y: 0 });
    const controlador = new ControladorRobots(registro);

    const base = new GestorRecarga(almacen, controlador).asignarBase(robot);

    expect(base.id).toBe('B2');
  });

  test('la inicialización valida batería inicial con costo efectivo hasta base', () => {
    expect(() => new InicializadorSimulacion().inicializar({
      dimensiones: { width: 3, height: 2 },
      estanterias: [],
      muelles: [],
      basesCarga: [{ x: 2, y: 0, id: 'B1' }],
    }, [
      { id: 'R1', x: 0, y: 0, bateria: 2 },
      { id: 'R2', x: 1, y: 0, bateria: 10 },
    ])).toThrow(/no tiene batería inicial/);
  });

  test('el asignador de órdenes elige el robot con menor costo efectivo hacia el origen', () => {
    const almacen = new AlmacenBuilder()
      .conDimensiones(3, 4)
      .conEstanterias([new Estanteria(2, 1)])
      .conMuelles([new Muelle(0, 0, 'M1')])
      .conBasesCarga([new BaseCarga(2, 3, 'B1')])
      .construir();
    const registro = new RegistroRobots(almacen);
    const r1 = new Robot('R1', 2, 0, 10);
    const r2 = new Robot('R2', 0, 3, 10);
    registro.registrar(r1);
    registro.registrar(r2);
    almacen.ocupar({ x: 1, y: 0 });
    const controlador = new ControladorRobots(registro);
    const camion = crearCamion();
    camion.acoplar(0);
    almacen.getMuelle('M1').acoplar(camion);
    const orden = new Orden('O1', camion, new PaqueteGeneral(null, 'P1', 1));

    new AsignadorOrdenes(almacen, registro, controlador).asignar([orden]);

    expect(orden.getRobotId()).toBe('R2');
  });

  test('el gestor de despeje elige el pasillo libre con menor costo efectivo', () => {
    const almacen = new AlmacenBuilder()
      .conDimensiones(3, 4)
      .conEstanterias([
        new Estanteria(0, 2),
        new Estanteria(1, 1),
        new Estanteria(2, 1),
      ])
      .conMuelles([new Muelle(0, 1, 'M1')])
      .conBasesCarga([new BaseCarga(0, 0, 'B1')])
      .construir();
    const registro = new RegistroRobots(almacen);
    const robot = new Robot('R1', 0, 0, 10);
    registro.registrar(robot);
    for (const posicion of [
      { x: 1, y: 0 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 1, y: 3 },
      { x: 2, y: 3 },
    ]) {
      almacen.ocupar(posicion);
    }
    const controlador = new ControladorRobots(registro);
    controlador.solicitarDespeje(robot);
    const rutas = new AsignadorRutas(almacen, new CalculadorRutas());

    new GestorDespeje(almacen, controlador, rutas).preparar(robot);

    expect(controlador.getContexto(robot).destinoDespeje).toEqual({ x: 0, y: 3 });
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
