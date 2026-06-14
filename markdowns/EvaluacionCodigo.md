# Evaluación técnica actual de LogisTech Sim

## 1. Resultado general

La implementación fue refactorizada según `Correcciones.md` preservando la API
del controlador y el contrato consumido por el frontend.

La línea base posterior al cambio cumple:

- compilación TypeScript estricta;
- suites unitarias e integrales exitosas;
- simulaciones completas `sim1` y `sim2`;
- ausencia de superposición de robots verificada en cada tick;
- separación física de clases y servicios por responsabilidad.

## 2. Cambios respecto de la evaluación anterior

Los principales problemas detectados en la versión inicial fueron resueltos:

| Observación anterior | Estado actual |
|---|---|
| Controlador componía, ejecutaba y mapeaba | Separado en inicializador, procesador y mapper |
| `Almacen` registraba robots | La flota pertenece a `RegistroRobots` |
| Ocupación inferida recorriendo robots | Cada `Celda` posee `ocupada` |
| Bases reservables | `BaseCarga` ya no implementa reservas |
| `Robot` gestionaba órdenes, recarga y despeje | Esa información pertenece a `ControladorRobots` |
| `GestorCamiones` creaba órdenes | Lo hace `ProcesadorManifiestos` |
| Orden guardaba datos duplicados del camión | Mantiene referencia directa a `Camion` |
| Ruta vacía era ambigua | Se usa `ResultadoCalculoRuta` discriminado |
| Observer interno confundía el reloj | Se reemplazó por `EjecutorRobotsPorTick` |
| Aplicación dependía de DTOs de infraestructura | Los contratos viven en aplicación |
| Asignación parcialmente atómica | Existe rollback completo y errores tipados |
| Recarga podía quedar silenciosamente imposible | Se valida y genera error de dominio |

## 3. Evaluación por componente

### `ControladorAlmacen`

Actúa como fachada estable para `SimuladorEntorno`. Mantiene el tick y delega:

- inicialización;
- procesamiento del paso;
- recepción y creación del camión;
- proyección del estado.

La clase tiene una única razón principal de cambio: el contrato público de la
simulación.

### `Almacen`

Representa exclusivamente la configuración espacial y el estado de las celdas.
No conoce entidades `Robot`.

La ocupación se modifica mediante operaciones atómicas. Una falla al ocupar el
destino restaura el origen antes de propagarse.

Las reservas se limitan a recursos operativos. Una base de carga solo puede
estar ocupada físicamente.

### `AlmacenBuilder`

Evita estados parcialmente construidos y concentra validaciones estructurales:

- dimensiones;
- definición completa;
- bases obligatorias;
- posiciones;
- superposiciones;
- identificadores duplicados.

Aplica Builder y Creator sin trasladar reglas de construcción al controlador.

### `Robot`

Conserva comportamiento propio sin convertirse en coordinador global.

Responsabilidades actuales:

- recibir y mantener una ruta;
- ejecutar un paso;
- validar el movimiento mediante el contexto;
- actualizar batería;
- transportar un paquete;
- mantener bloqueos y estrategia;
- exponer su estado.

Las decisiones de transición pertenecen a `ControladorRobots`.

### `ControladorRobots`

Mantiene la actividad que antes estaba distribuida en campos anulables del
robot:

- orden;
- fase;
- base asignada;
- necesidad y destino de despeje.

Esto evita que el robot conozca camiones, almacén, estanterías o reglas de
asignación.

### `GestorCamiones`

Solo administra:

- registro;
- acople;
- desacople;
- colas FIFO por muelle.

La liberación de manifiestos y la creación de órdenes son responsabilidad de
`ProcesadorManifiestos`. La detección de finalización pertenece a
`RetiradorCamionesCompletos`.

### `GestorRecarga`

Selecciona la base más cercana y procesa incrementos de batería. No reserva
bases ni calcula rutas.

La separación permite que varios robots tengan el mismo destino. La ocupación
de la celda evita colisiones y esperar no consume energía.

### `OrquestadorRobots`

Es el intermediario entre robot y entorno. Coordina colaboradores sin absorber
su implementación:

- `ControladorRobots`;
- `AsignadorRutas`;
- `GestorRecarga`;
- `PoliticaBateria`;
- `GestorDespeje`.

Sigue siendo el servicio con mayor cantidad de decisiones, pero sus ramas
expresan el orden del caso de uso y delegan cálculos y mutaciones especializadas.

## 4. SOLID

### SRP

Las responsabilidades que antes convivían en `model.ts`, `services.ts` y el
controlador están separadas en clases con motivos de cambio distintos.

### OCP

Las estrategias de navegación y priorización pueden ampliarse implementando sus
contratos. `CalculadorRutas` funciona como registro de estrategias soportadas.

### LSP

`Estanteria` y `Muelle` respetan la semántica reservable. `BaseCarga` deja de
heredar esa capacidad, evitando prometer una operación que no corresponde.

### ISP

Los contratos son pequeños y específicos:

- estrategia de ruta;
- contexto de movimiento;
- política de priorización;
- observer externo.

### DIP

Aplicación depende de contratos propios, no de DTOs definidos en
infraestructura. Las políticas variables ingresan por abstracciones.

## 5. GRASP

- **Controller:** fachada, procesador de paso y controladores de robots.
- **Information Expert:** ocupación en celda, movimiento y batería en robot,
  paquete en estantería, acople en muelle.
- **Creator:** builder, fábrica, gestor de paquetes y procesador de manifiestos.
- **Pure Fabrication:** registros, mapeador, asignadores y gestores.
- **Indirection:** orquestadores median entre entidades y servicios.
- **Protected Variations:** DTOs, mapper y estrategias protegen fronteras.
- **Low Coupling / High Cohesion:** ningún servicio necesita conocer el sistema
  completo para cumplir su caso de uso.

## 6. Patrones

- Facade: `ControladorAlmacen`.
- Builder: `AlmacenBuilder`.
- Strategy: Movimiento L, A* y prioridad.
- Factory: `FabricaDominio` y `GestorPaquetes`.
- Mapper/DTO: salida al frontend y entradas externas.
- Application Service: gestores, asignadores y orquestadores.
- Registry: robots y órdenes.
- Observer: notificación externa de ticks.

No se aplicó State con una clase por estado. El enum público y el contexto
operativo controlado ofrecen menor complejidad para las cuatro transiciones
requeridas.

## 7. Reglas críticas verificadas

Las pruebas cubren:

- builder incompleto y ausencia de bases;
- superposición e identificadores duplicados;
- asociación directa entre orden y camión;
- FEFO y peso;
- ocupación atómica;
- costo de movimiento con y sin carga;
- movimiento bloqueado sin consumo;
- precedencia por id;
- resultados de navegación explícitos;
- cambio de estrategia al tercer bloqueo;
- rollback de asignación;
- robot inactivo con batería mínima;
- robot inicialmente incapaz de alcanzar una base;
- base compartida y espera sin consumo;
- carga, movimiento y descarga en ticks separados;
- cola FIFO de camiones;
- recarga y reanudación;
- snapshot priorizado;
- ejecución completa de `sim1` y `sim2`;
- ausencia de superposición en cada tick.

## 8. Riesgos residuales

### Tick duplicado

`SimuladorEntorno` y `ControladorAlmacen` conservan contadores separados para
mantener compatibilidad. La convención está encapsulada, pero una futura API
podría recibir el tick externo explícitamente.

### Transacción de tick

La asignación individual posee rollback, pero un tick completo no es una
transacción global. Un error estructural detiene el paso después de las
mutaciones previas ya válidas.

### Escalabilidad

Las búsquedas de inventario, pasillos y prioridad recorren colecciones. Es
adecuado para las simulaciones actuales; índices adicionales solo deberían
agregarse si el volumen lo exige.

### Contrato frontend duplicado

El DTO del backend y los tipos del frontend siguen definidos en proyectos
distintos. El formato se conserva y está probado indirectamente, pero podrían
generarse desde una fuente compartida en una evolución posterior.

## 9. Conclusión

La versión actual refleja con mayor fidelidad SOLID y GRASP porque las entidades
conservan comportamiento propio mientras las decisiones globales se ubican en
servicios cohesivos.

El principal avance no es solamente la división de archivos: la topología ya
no conoce robots, el robot ya no coordina el entorno, las bases dejaron de
simular reservas, las órdenes conocen su camión y las rutas y errores de energía
tienen contratos explícitos.
