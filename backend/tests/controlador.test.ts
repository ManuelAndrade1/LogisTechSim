import path from 'path';
import { ControladorAlmacen, EstadoAlmacenDTO } from '../src/application/ControladorAlmacen';
import { CSVLoader } from '../src/infrastructure/factories/CSVLoader';
import { CamionDTO, MapaConfigDTO, RobotConfigDTO } from '../src/infrastructure/dtos';

const mapaSimple = (conBase = false): MapaConfigDTO => ({
  dimensiones: { width: 5, height: 2 },
  estanterias: [{ x: 4, y: 0 }],
  muelles: [{ x: 0, y: 0, id: 'M1' }],
  basesCarga: conBase ? [{ x: 1, y: 1, id: 'B1' }] : [],
});

const robots: RobotConfigDTO[] = [{ id: 'R1', x: 0, y: 0, bateria: 100 }];

const camionRecepcion = (id = 'C1', paqueteId = 'P1'): CamionDTO => ({
  id,
  tipo: 'RECEPCION',
  muelleId: 'M1',
  tickLlegada: 1,
  ordenes: [{
    id: `O-${id}`,
    camionId: id,
    paqueteId,
    tipoPaquete: 'GENERAL',
    peso: 10,
    vencimiento: null,
  }],
});

describe('ControladorAlmacen', () => {
  test('registra en t+1 y separa carga, movimiento y descarga en ticks físicos', () => {
    const controlador = new ControladorAlmacen();
    controlador.inicializar(mapaSimple(), robots);
    controlador.onCamionLlega(camionRecepcion());

    controlador.procesarPaso();
    expect(controlador.obtenerEstado().robots[0]).toMatchObject({
      id: 'R1',
      x: 0,
      y: 0,
      carga: false,
      estado: 'INACTIVO',
      bateria: 100,
      ordenId: null,
      paqueteId: null,
    });
    expect(controlador.obtenerEstado().ordenes).toHaveLength(0);

    controlador.procesarPaso();
    expect(controlador.obtenerEstado().robots[0]).toMatchObject({
      id: 'R1',
      x: 0,
      y: 0,
      carga: true,
      estado: 'OPERANDO',
      bateria: 100,
      ordenId: 'O-C1',
      paqueteId: 'P1',
    });
    expect(controlador.obtenerEstado().ordenes).toEqual([{
      id: 'O-C1',
      camionId: 'C1',
      tipoCamion: 'RECEPCION',
      estado: 'PENDIENTE',
      robotId: 'R1',
      paqueteId: 'P1',
      tipoPaquete: 'GENERAL',
      peso: 10,
      vencimiento: null,
    }]);

    controlador.procesarPaso();
    expect(controlador.obtenerEstado().robots[0]).toMatchObject({
      x: 1, y: 0, carga: true,
    });

    controlador.procesarPaso();
    controlador.procesarPaso();
    controlador.procesarPaso();
    controlador.procesarPaso();
    expect(controlador.obtenerEstado().robots[0]).toMatchObject({
      x: 4, y: 0, carga: false, estado: 'INACTIVO',
    });
    expect(controlador.obtenerEstado().estanterias[0].paquetes[0].id).toBe('P1');
    expect(controlador.obtenerEstado().camiones).toHaveLength(0);
    expect(controlador.obtenerEstado().ordenes[0]).toMatchObject({
      id: 'O-C1',
      estado: 'COMPLETADA',
      robotId: 'R1',
    });

    controlador.procesarPaso();
    expect(controlador.obtenerEstado().robots[0]).toMatchObject({
      x: 3, y: 0, carga: false, estado: 'INACTIVO',
    });
  });

  test('un camión en cola espera un tick desde su acople efectivo', () => {
    const controlador = new ControladorAlmacen();
    controlador.inicializar(mapaSimple(), robots);
    controlador.onCamionLlega(camionRecepcion('C1', 'P1'));
    controlador.onCamionLlega({
      id: 'C2',
      tipo: 'DESPACHO',
      muelleId: 'M1',
      tickLlegada: 1,
      ordenes: [{
        id: 'O-C2',
        camionId: 'C2',
        paqueteId: 'P1',
        tipoPaquete: 'GENERAL',
        peso: 10,
        vencimiento: null,
      }],
    });

    for (let i = 0; i < 7; i++) controlador.procesarPaso();
    let estado = controlador.obtenerEstado();
    expect(estado.camiones).toEqual([{ x: 0, y: 0, tipo: 'DESPACHO' }]);
    expect(estado.estanterias[0].paquetes).toHaveLength(1);
    expect(estado.robots[0].carga).toBe(false);

    controlador.procesarPaso();
    estado = controlador.obtenerEstado();
    expect(estado.robots[0]).toMatchObject({ x: 4, y: 0, carga: true });
    expect(estado.estanterias[0].paquetes).toHaveLength(0);

    for (let i = 0; i < 5; i++) controlador.procesarPaso();
    estado = controlador.obtenerEstado();
    expect(estado.robots[0]).toMatchObject({ x: 0, y: 0, carga: false });
    expect(estado.camiones).toHaveLength(0);

    controlador.procesarPaso();
    expect(controlador.obtenerEstado().robots[0]).toMatchObject({
      x: 0, y: 1, carga: false, estado: 'INACTIVO',
    });
  });

  test('se desvía a recargar antes de tomar una carga que no puede transportar', () => {
    const controlador = new ControladorAlmacen();
    controlador.inicializar(mapaSimple(true), [{ id: 'R1', x: 0, y: 0, bateria: 2 }]);
    controlador.onCamionLlega(camionRecepcion());

    controlador.procesarPaso();
    controlador.procesarPaso();
    let estado = controlador.obtenerEstado();
    expect(estado.robots[0].carga).toBe(false);
    expect(['BATERIA_BAJA', 'RECARGANDO']).toContain(estado.robots[0].estado);

    for (let i = 0; i < 40; i++) controlador.procesarPaso();
    estado = controlador.obtenerEstado();
    expect(estado.camiones).toHaveLength(0);
    expect(estado.estanterias[0].paquetes[0].id).toBe('P1');
    expect(estado.robots[0]).toMatchObject({ estado: 'INACTIVO', carga: false });
  });

  test('expone todas las órdenes ordenadas por prioridad, incluso completadas', () => {
    const controlador = new ControladorAlmacen();
    controlador.inicializar({
      dimensiones: { width: 5, height: 3 },
      estanterias: [{ x: 3, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 1 }],
      muelles: [{ x: 0, y: 0, id: 'M1' }],
      basesCarga: [],
    }, [
      { id: 'R1', x: 0, y: 0, bateria: 100 },
      { id: 'R2', x: 0, y: 1, bateria: 100 },
      { id: 'R3', x: 0, y: 2, bateria: 100 },
    ]);
    controlador.onCamionLlega({
      id: 'C1',
      tipo: 'RECEPCION',
      muelleId: 'M1',
      tickLlegada: 1,
      ordenes: [
        {
          id: 'G-LIVIANO',
          camionId: 'C1',
          paqueteId: 'P1',
          tipoPaquete: 'GENERAL',
          peso: 10,
          vencimiento: null,
        },
        {
          id: 'C-TARDE',
          camionId: 'C1',
          paqueteId: 'P2',
          tipoPaquete: 'COMESTIBLE',
          peso: 5,
          vencimiento: '2027-01-01',
        },
        {
          id: 'G-PESADO',
          camionId: 'C1',
          paqueteId: 'P3',
          tipoPaquete: 'GENERAL',
          peso: 80,
          vencimiento: null,
        },
      ],
    });

    controlador.procesarPaso();
    controlador.procesarPaso();

    expect(controlador.obtenerEstado().ordenes.map(orden => orden.id)).toEqual([
      'C-TARDE',
      'G-PESADO',
      'G-LIVIANO',
    ]);
  });
});

describe.each([
  ['sim1', 250, []],
  ['sim2', 450, ['PA2', 'PA4']],
] as const)('simulación completa %s', (simulacion, ticks, paquetesEsperados) => {
  test('finaliza camiones, órdenes y movimientos sin superponer robots', () => {
    const base = path.resolve(__dirname, `../data/${simulacion}`);
    const almacenConfig = CSVLoader.loadAlmacen(path.join(base, 'almacen.csv'));
    const camiones = CSVLoader.loadCamiones(path.join(base, 'camiones.csv'));
    const ordenes = CSVLoader.loadOrdenes(path.join(base, 'ordenes.csv'));
    const controlador = new ControladorAlmacen();
    controlador.inicializar({
      dimensiones: almacenConfig.dimensiones,
      estanterias: almacenConfig.estanterias,
      muelles: almacenConfig.muelles,
      basesCarga: almacenConfig.basesCarga,
    }, almacenConfig.robots);

    for (let tick = 1; tick <= ticks; tick++) {
      for (const camion of camiones.filter(item => item.tickLlegada === tick)) {
        controlador.onCamionLlega({
          ...camion,
          ordenes: ordenes.filter(orden => orden.camionId === camion.id),
        });
      }
      controlador.procesarPaso();
    }

    const estado: EstadoAlmacenDTO = controlador.obtenerEstado();
    expect(estado.camiones).toHaveLength(0);
    expect(estado.robots.every(robot =>
      robot.estado === 'INACTIVO' && !robot.carga)).toBe(true);
    expect(new Set(estado.robots.map(robot => `${robot.x},${robot.y}`)).size)
      .toBe(estado.robots.length);
    const celdasEspeciales = new Set([
      ...almacenConfig.estanterias,
      ...almacenConfig.muelles,
      ...almacenConfig.basesCarga,
    ].map(celda => `${celda.x},${celda.y}`));
    expect(estado.robots.every(robot =>
      !celdasEspeciales.has(`${robot.x},${robot.y}`))).toBe(true);
    expect(estado.estanterias.flatMap(estanteria =>
      estanteria.paquetes.map(paquete => paquete.id)).sort())
      .toEqual([...paquetesEsperados].sort());
  });
});
