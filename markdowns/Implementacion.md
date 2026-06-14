# Implementación de LogisTech Sim

## Arquitectura

`ControladorAlmacen` es la fachada utilizada por `SimuladorEntorno` y la raíz de
composición. Su única lógica propia es mantener el orden del tick y conectar los
colaboradores. El estado pertenece a las entidades del dominio, no a variables
globales ni a singletons.

Responsabilidades principales:

- `Almacen`: celdas, robots, ocupación y acceso a recursos.
- `Robot`: movimiento, posición, batería, ruta, carga y estado propio.
- `RelojAlmacen`: Subject interno que notifica a los robots observers por id.
- `GestorCamiones`: acople, colas FIFO, registro diferido y retiro.
- `OrquestadorOrdenes`: consulta órdenes pendientes elegibles.
- `PriorizadorOrdenes`: política FEFO/peso, sin asignar ni almacenar órdenes.
- `AsignadorOrdenes`: selección de robots y reserva atómica de origen/destino.
- `OrquestadorRobots`: rutas, batería, bloqueos, estrategias y estados.
- `GestorTransferencias`: validación y ejecución de cargas y descargas.
- `GestorPaquetes`: creación física, almacenamiento y retiro.
- `GestorRecarga`: reserva de bases y ciclos de recarga.
- `PlanificadorRutas`: selección entre Movimiento L y A*.

## Secuencia del tick

1. Registrar manifiestos de camiones acoplados en el tick anterior.
2. Obtener y priorizar órdenes elegibles.
3. Asignar órdenes y reservar recursos.
4. Preparar rutas, desvíos a carga y despejes post-orden pendientes.
5. Notificar a los robots mediante `RelojAlmacen`.
6. Procesar bloqueos, transferencias y recargas informadas por los robots.
7. Asignar rutas post-orden a los robots que completaron una descarga.
8. Retirar camiones terminados y acoplar el siguiente de cada cola.

Asignar una orden o calcular una ruta no consume tiempo. Cada robot realiza como
máximo una actividad física por tick: mover, cargar, descargar o recargar.

Un camión acoplado en `t` mantiene su manifiesto sin registrar durante ese ciclo.
Sus órdenes se crean y pueden asignarse al comenzar `t+1`. La misma regla se
aplica a los camiones que salen de una cola.

## Decisiones de dominio

- El robot ejecuta el siguiente paso de su ruta. Si la celda está ocupada,
  conserva ruta, batería y posición, y devuelve `MOVIMIENTO_BLOQUEADO`.
- Todo avance exitoso restablece inmediatamente `bloqueos` a cero.
- Al tercer bloqueo, el orquestador alterna Movimiento L/A* y recalcula la ruta.
- Los robots se notifican por id; por eso el id menor tiene precedencia ante un
  destino disputado.
- Al completar una orden, el robot queda `INACTIVO` y recibe una ruta hacia el
  pasillo libre más cercano. La descarga y el movimiento ocurren en ticks distintos.
- Los empates entre pasillos se resuelven por coordenada `x` y luego `y`.
- El destino de despeje no se reserva. Si otro robot lo ocupa, se selecciona uno
  nuevo; si no existe ninguno libre, se vuelve a intentar en ticks posteriores.
- Un robot sigue disponible mientras despeja. Una nueva orden cancela y reemplaza
  inmediatamente la ruta post-orden.
- Las celdas especiales son transitables. Sus reservas protegen operaciones,
  no la circulación.
- La energía se calcula con Manhattan: costo `1` sin carga y `2` con carga,
  incluyendo energía posterior para alcanzar una base.
- La recarga suma `10` por tick hasta `100`. La orden y sus reservas se conservan.
- Un paquete de recepción mantiene `id = null` hasta descargarse en una
  estantería válida. Allí recibe el id planificado.
- Una orden de despacho no es elegible hasta encontrar su paquete físico.
- Las estanterías almacenan un único paquete.

## GRASP, SOLID y patrones

- **Controller:** `ControladorAlmacen` y los orquestadores por caso de uso.
- **Information Expert:** `Robot` mueve y consume batería; `Estanteria` guarda;
  `Muelle` acopla; cada entidad valida su estado.
- **Creator:** `FabricaDominio` traduce DTO a entidades; `GestorPaquetes` crea
  los subtipos de paquete.
- **Bajo acoplamiento y alta cohesión:** priorización, asignación, navegación,
  transferencias, recarga y camiones tienen colaboradores separados.
- **SRP:** cada servicio representa una razón de cambio.
- **OCP/DIP:** navegación y priorización se consumen mediante interfaces.
- **Strategy:** Movimiento L, A* y política de priorización.
- **Observer:** `RelojAlmacen` notifica a los robots sin conocer su actividad.
- **Protected Variations:** DTO y snapshot aíslan infraestructura y frontend.

## Aclaraciones y contradicciones resueltas

- La planificación completa de camiones no llega al controlador. La notificación
  de `SimuladorEntorno` se toma como validación de que la llegada estaba prevista.
- El peso prioriza órdenes generales, pero no representa una capacidad máxima.
- Una orden temporalmente inviable no impide asignar otras.
- El despeje post-orden es proactivo: evita que un robot quede estacionado sobre
  una estantería, muelle o base hasta que otra operación necesite ese recurso.
- Los errores estructurales, como ids duplicados o recursos inexistentes,
  generan excepciones descriptivas antes de dejar reservas parciales.
