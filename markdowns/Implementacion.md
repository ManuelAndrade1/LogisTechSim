# Implementación de LogisTech Sim

## 1. Arquitectura

El backend se organiza en dominio, aplicación e infraestructura.

- `domain/entities`: entidades con estado e invariantes propias.
- `domain/builders`: construcción válida del agregado espacial.
- `domain/navigation`: estrategias y resultados de cálculo de rutas.
- `domain/registries`: registro de entidades que no pertenecen al almacén.
- `application`: coordinación de casos de uso y políticas.
- `application/contracts`: contratos de entrada y salida independientes de
  infraestructura.
- `infrastructure`: CSV, HTTP, entorno de simulación y observers externos.

`ControladorAlmacen` conserva la API requerida por el entorno, pero funciona
únicamente como fachada:

- delega la composición en `InicializadorSimulacion`;
- delega cada tick en `ProcesadorPasoSimulacion`;
- delega el snapshot en `MapeadorEstadoAlmacen`;
- conserva solamente el contexto inicializado y el tick lógico.

## 2. Construcción del almacén

`AlmacenBuilder` impide crear un almacén incompleto. Antes de construir deben
haberse definido:

- dimensiones;
- estanterías;
- muelles;
- bases de carga.

La construcción rechaza dimensiones inválidas, posiciones fuera de rango,
celdas especiales superpuestas, identificadores duplicados y configuraciones
sin bases de carga.

Los robots no pertenecen a `Almacen`. `RegistroRobots` administra la flota y
registra su ocupación inicial en las celdas.

## 3. Responsabilidades del dominio

### `Almacen` y `Celda`

Cada `Celda` mantiene su ocupación física mediante un booleano. `Almacen`
administra la topología y ofrece operaciones para:

- consultar ocupación;
- ocupar y liberar una celda;
- mover ocupación de forma atómica;
- reservar y liberar recursos operativos.

Solo `Estanteria` y `Muelle` son reservables. `BaseCarga` no posee reserva:
varios robots pueden recibirla como destino y la ocupación física decide cuál
puede ingresar.

### `Robot`

`Robot` conserva exclusivamente:

- posición;
- batería;
- ruta;
- carga;
- bloqueos;
- estrategia de navegación;
- estado público.

El robot recibe rutas y ejecuta un único movimiento por tick. Consulta al
almacén mediante un contexto de movimiento, conserva la ruta cuando está
bloqueado y no consume batería si no se mueve.

Un único método interno actualiza batería:

- `-1` al moverse sin carga;
- `-2` al moverse con carga;
- `+10` por ciclo de recarga, hasta `100`.

El robot puede cargar y descargar paquetes, pero no los crea ni decide estados,
órdenes, recargas o despejes.

### `Orden`

`Orden` mantiene una referencia directa e inmutable al `Camion` de origen.
Además conserva paquete, asignación, origen, destino y estado. El DTO proyecta
el identificador y tipo del camión sin exponer la entidad.

## 4. Servicios de aplicación

### Simulación

- `InicializadorSimulacion`: crea y conecta el grafo de objetos.
- `ProcesadorPasoSimulacion`: define el orden del tick.
- `MapeadorEstadoAlmacen`: transforma dominio a `EstadoAlmacenDTO`.
- `ContextoSimulacion`: agrupa colaboradores ya inicializados.

### Robots

- `ControladorRobots`: única autoridad sobre transiciones, orden activa, fase,
  recarga y despeje.
- `EjecutorRobotsPorTick`: ejecuta robots por id y produce resultados de
  actividad.
- `OrquestadorRobots`: intermedia entre robot y entorno.
- `AsignadorRutas`: entrega al robot el resultado del calculador.
- `PoliticaBateria`: calcula la energía preventiva con Manhattan.
- `GestorDespeje`: administra la ruta posterior sin crear un estado adicional.

El despeje es una actividad de un robot `INACTIVO`. Una nueva orden lo cancela
y reemplaza su ruta.

### Camiones y órdenes

- `GestorCamiones`: registra, acopla, desacopla y mantiene colas FIFO.
- `ProcesadorManifiestos`: crea y registra órdenes un tick después del acople.
- `RetiradorCamionesCompletos`: detecta camiones terminados.
- `RegistroOrdenes`: mantiene las órdenes por identidad.
- `OrquestadorOrdenes`: determina elegibilidad.
- `PriorizadorOrdenes`: aplica FEFO y peso.
- `AsignadorOrdenes`: selecciona recursos y realiza una asignación
  transaccional.

Los conflictos esperables de reserva omiten temporalmente la orden. Cualquier
error estructural se propaga después de revertir reservas y asignaciones.

### Paquetes y transferencias

- `GestorPaquetes`: crea subtipos, materializa recepciones y retira despachos.
- `GestorTransferencias`: valida y coordina carga y descarga entre robot,
  orden, estantería y muelle.

## 5. Navegación

`CalculadorRutas` aplica Strategy sobre `MovimientoL` y `AStar`.

El resultado es explícito:

```typescript
type ResultadoCalculoRuta =
  | { tipo: 'EN_DESTINO' }
  | { tipo: 'RUTA'; pasos: Posicion[] }
  | { tipo: 'SIN_CAMINO' };
```

Una ruta imposible ya no se confunde con estar en destino. Los obstáculos
dinámicos se reintentan en ticks posteriores. Al tercer bloqueo el robot cambia
entre Movimiento L y A* y se recalcula el objetivo actual.

## 6. Batería y recarga

La configuración debe incluir al menos una base y cada robot debe poder
alcanzar alguna con su batería inicial.

Antes de una orden o un despeje se calcula preventivamente la energía mínima:

- movimiento sin carga: costo `1`;
- movimiento con carga: costo `2`;
- estimación espacial: distancia Manhattan;
- se incluye la llegada posterior desde el destino de la orden hasta una base.

Cuando la batería es igual o inferior al mínimo, `ControladorRobots` cambia el
estado a `BATERIA_BAJA`.

`GestorRecarga` selecciona siempre la base más cercana, sin reservarla y sin
calcular rutas. `AsignadorRutas` calcula el recorrido. Si la base está ocupada,
el robot espera sin moverse ni consumir batería.

Al completar la recarga:

- con orden: vuelve a `OPERANDO`;
- sin orden: vuelve a `INACTIVO` y solicita despeje de la base.

Una insuficiencia no recuperable genera un error de dominio descriptivo en vez
de dejar al robot bloqueado silenciosamente.

## 7. Secuencia del tick

1. Procesar manifiestos habilitados.
2. Obtener y priorizar órdenes elegibles.
3. Asignar órdenes y reservar origen/destino.
4. Preparar órdenes, recargas y despejes.
5. Ejecutar una actividad física por robot, ordenados por id.
6. Procesar bloqueos y cambios de estrategia.
7. Procesar cargas y descargas.
8. Preparar despejes de órdenes completadas.
9. Procesar ciclos de recarga.
10. Retirar camiones completos y acoplar el siguiente de la cola.

Asignar, reservar, calcular rutas o cambiar estado no consume un tick físico.

## 8. SOLID, GRASP y patrones

- **Controller:** fachada y controladores de casos de uso.
- **Information Expert:** celda para ocupación, robot para movimiento y
  batería, estantería para paquete y muelle para acople.
- **Creator:** builder, fábrica de dominio, procesador de manifiestos y gestor
  de paquetes.
- **Pure Fabrication:** registros, gestores, orquestadores y mapeadores.
- **Low Coupling / High Cohesion:** flota, topología, presentación, navegación,
  recarga y logística tienen responsables separados.
- **SRP:** el controlador dejó de construir, ejecutar y mapear por sí mismo.
- **OCP/DIP:** navegación y priorización dependen de contratos pequeños.
- **ISP:** contratos separados para rutas, movimiento, prioridad y observers.
- **Strategy:** Movimiento L, A* y priorización.
- **Builder:** construcción válida de `Almacen`.
- **Facade:** `ControladorAlmacen`.
- **DTO / Mapper:** aislamiento del frontend y de las fuentes externas.
- **Observer:** se conserva solamente para notificaciones externas del entorno.

## 9. Compatibilidad

Se mantienen:

- los cuatro métodos públicos de `ControladorAlmacen`;
- el formato de `EstadoAlmacenDTO`;
- el comportamiento síncrono del entorno;
- el orden determinista por id;
- las importaciones históricas mediante `domain/model.ts`,
  `application/services.ts` e `infrastructure/dtos/index.ts`.
