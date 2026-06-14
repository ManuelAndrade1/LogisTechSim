# Extracción estructurada de la solución - LogisTech Sim


## 1. Restricciones y aclaraciones del modelado

### 1.1. Verificación de batería

- La verificación de suficiencia de batería se realiza a partir de la **distancia de Manhattan** entre los puntos involucrados.
- Esa distancia se multiplica por el **costo de movimiento correspondiente**.
- El costo de movimiento de un robot **sin carga** es igual a `1`.
- El costo de movimiento de un robot **con carga** es igual a `2`.

### 1.2. Priorización de órdenes

- El procesamiento de órdenes sigue un criterio de priorización **FEFO**.
- Los paquetes **comestibles** tienen prioridad absoluta sobre los paquetes **generales**, independientemente del peso de estos últimos.
- Entre paquetes comestibles, se prioriza el paquete cuya **fecha de vencimiento sea más próxima**, según el criterio **First Expired, First Out**.
- Entre paquetes generales, se priorizan primero los de **mayor peso**, en orden descendente.

### 1.3. Creación preliminar y física de paquetes

- Al procesar una orden se crea una instancia preliminar de `Paquete` con `id` nulo.
- El `Paquete` con `id` nulo representa que todavía no existe como paquete físico almacenado.
- El identificador definitivo se asigna recién cuando el robot descarga el paquete en una **estantería válida**.
- El paquete pasa a existir físicamente dentro del almacén cuando queda descargado en la estantería válida.

---

## 2. Especificaciones de casos de uso

### 2.1. Caso de Uso: Acoplándose a Muelle

- **Actor:** Camión
- **PRE:** El camión tiene una llegada programada y el muelle asignado existe en el almacén.
- **POST:** El camión queda registrado como acoplado al muelle correspondiente.

#### Curso normal

1. El camión informa su llegada al sistema.
2. El sistema verifica que el camión se encuentre registrado en la planificación.
3. El sistema verifica el muelle asignado al camión.
4. El sistema verifica que el muelle no tenga otro camión acoplado.
5. El sistema registra al camión como acoplado en el muelle correspondiente.
6. Fin del caso de uso.

---

### 2.2. Caso de Uso: Procesando Órdenes

- **Actor:** Camión
- **PRE:** Existe al menos un camión acoplado en el sistema.
- **POST:** Las órdenes correspondientes quedan disponibles para su posterior asignación.

#### Curso normal

1. El sistema identifica los camiones que se encuentran acoplados. `<Usa: ACOPLÁNDOSE A MUELLE>`
2. El sistema verifica cuáles de esos camiones ya estaban acoplados desde un ciclo anterior.
3. El camión provee sus órdenes al sistema.
4. El sistema registra las órdenes de los camiones y asocia los datos primitivos del paquete de cada orden a un paquete sin identificador (`id`).
5. El sistema registra dichas órdenes como pendientes.
6. Fin del caso de uso.

---

### 2.3. Caso de Uso: Recibiendo Orden

- **Actor:** Robot
- **PRE:** Existe al menos una orden pendiente y al menos un robot disponible para recibir una tarea.
- **POST:** Una orden queda asignada a un robot y se reserva el destino correspondiente.

#### Curso normal

1. El sistema identifica las órdenes pendientes disponibles.
2. El sistema identifica los robots que se encuentran en estado `INACTIVO`.
3. El sistema aplica las reglas de prioridad sobre las órdenes disponibles.
4. Si existen órdenes de paquetes comestibles, el sistema prioriza la orden con fecha de vencimiento más próxima.
5. Si no existen órdenes de paquetes comestibles, el sistema prioriza la orden de paquete general de mayor peso.
6. El sistema selecciona una orden según el criterio de prioridad.
7. El sistema selecciona un robot disponible.
8. Si el robot puede recibir la tarea, el sistema le asigna la orden.
9. El sistema reserva la celda de origen `(carga)` y destino `(descarga)` correspondiente a la tarea.
10. El sistema actualiza el estado del robot a `OPERANDO`.
11. Fin del caso de uso.

---

### 2.4. Caso de Uso: Recibiendo Ruta

- **Actor:** Robot
- **PRE:** El robot tiene una tarea asignada o debe dirigirse a una base de carga.
- **POST:** El robot recibe una ruta válida hacia el destino indicado.

#### Curso normal

1. El sistema identifica el destino correspondiente según la tarea activa del robot.
2. El sistema verifica la posición actual del robot.
3. El sistema calcula una ruta inicial hacia el destino utilizando la estrategia de navegación correspondiente.
4. El sistema informa la ruta al robot.
5. El robot recibe la ruta indicada.
6. Fin del caso de uso.

---

### 2.5. Caso de Uso: Cargando Paquete

- **Actor:** Robot
- **PRE:** El robot tiene una orden asignada y se encuentra en una celda válida para retirar un paquete.
- **POST:** El sistema registra que el robot transporta el paquete correspondiente.

#### Curso normal

1. El sistema verifica que el robot se encuentre en la celda correspondiente al origen esperado de la orden.
2. El sistema identifica el paquete asociado a la orden.
3. El sistema registra el paquete como carga actual del robot.
4. El sistema identifica el tipo de celda en el que se encuentra el robot:
   1. Si es estantería, actualiza su disponibilidad.
   2. Si es muelle, no hace nada.
5. Fin del caso de uso.

---

### 2.6. Caso de Uso: Descargando Paquete

- **Actor:** Robot
- **PRE:** El robot transporta un paquete y se encuentra en el destino reservado para su tarea.
- **POST:** El paquete queda registrado en su destino y la orden queda completada.

#### Curso normal

1. El sistema verifica que el robot se encuentre en la celda correspondiente al destino esperado de la orden.
2. El sistema verifica que la celda de destino esté reservada para ese robot.
3. El sistema verifica que el robot transporte el paquete correspondiente a la orden.
4. El sistema registra el tipo de camión del que proviene la orden:
   1. Si proviene de un camión de recepción, el sistema registra el paquete como almacenado en la estantería. `<Usa: CREANDO PAQUETE>`
   2. Si la orden corresponde a un camión de despacho, no hace nada.
5. El sistema actualiza la carga del robot como vacía.
6. El sistema libera la reserva de la celda de destino.
7. El sistema registra la orden como completada.
8. Fin del caso de uso.

---

### 2.7. Caso de Uso: Creando Paquete

- **Actor:** Robot
- **PRE:** Una orden de recepción fue asignada y el sistema registró la descarga del paquete en la estantería.
- **POST:** El paquete queda creado como entidad física dentro del almacén.

#### Curso normal

1. El sistema registra la descarga del paquete en la estantería.
2. El sistema verifica que la estantería de destino esté vacía.
3. El sistema asigna un `id` al paquete.
4. Fin del caso de uso.

---

### 2.8. Caso de Uso: Recargando Batería

- **Actor:** Robot
- **PRE:** El robot se encuentra en estado `BATERÍA BAJA` y debe dirigirse a una base de carga.
- **POST:** El robot queda registrado con batería recuperada y vuelve al estado que corresponda.

#### Curso normal

1. El sistema identifica la base de carga más cercana. Las bases no se reservan
   y pueden ser asignadas como destino a más de un robot.
2. El sistema informa al robot la ruta hacia la base de carga. `<Usa: RECIBIENDO RUTA>`
3. El robot se dirige a la base de carga.
4. Si la base está ocupada, el robot espera en su celda actual sin consumir
   batería.
5. El sistema identifica la llegada a la base de carga.
6. El sistema actualiza el estado del robot a `RECARGANDO`.
7. En cada ciclo de recarga, el sistema incrementa el nivel de batería registrado del robot.
8. Cuando la batería alcanza el nivel máximo, el sistema actualiza el estado del robot:
   1. Si el robot tenía una orden pendiente, el sistema lo registra nuevamente como `OPERANDO`.
   2. Si el robot no tenía una orden pendiente, el sistema lo registra como `INACTIVO`.
9. Un robot que termina de recargar sin orden inicia un despeje de la base
   mientras permanece `INACTIVO`.
10. Fin del caso de uso.

---

### 2.9. Caso de Uso: Ejecutando Orden

- **Actor:** Robot
- **PRE:** El robot tiene una orden asignada por el sistema.
- **POST:** El sistema registra el avance o la finalización de la orden ejecutada por el robot.

#### Curso normal

1. El robot recibe una orden del sistema. `<Usa: RECIBIENDO ORDEN>`
2. El sistema identifica el tipo de orden y calcula la ruta correspondiente. `<Usa: RECIBIENDO RUTA>`
3. El robot llega a la ubicación inicial, carga el paquete. `<Usa: CARGANDO PAQUETE>`
4. El robot llega a la ubicación final, descarga el paquete. `<Usa: DESCARGANDO PAQUETE>`
5. El sistema actualiza el estado de la orden.
6. Fin del caso de uso.

---

## 3. Diagrama de casos de uso

### 3.1. Límite del sistema

- **Sistema:** `LogisTech`

### 3.2. Actores representados

| Actor | Casos de uso conectados directamente en el diagrama |
|---|---|
| `Robot` | `Ejecutando Orden`, `Recargando Batería` |
| `Camión` | `Procesando Órdenes` |

### 3.3. Casos de uso dentro de LogisTech

- `Recibiendo Orden`
- `Ejecutando Orden`
- `Recargando Batería`
- `Cargando Paquete`
- `Descargando Paquete`
- `Creando Paquete`
- `Recibiendo Ruta`
- `Procesando Órdenes`
- `Acoplándose a Muelle`

### 3.4. Relaciones `includes` representadas en el diagrama

| Caso de uso origen | Relación | Caso de uso incluido |
|---|---:|---|
| `Ejecutando Orden` | `<includes>` | `Recibiendo Orden` |
| `Ejecutando Orden` | `<includes>` | `Cargando Paquete` |
| `Ejecutando Orden` | `<includes>` | `Descargando Paquete` |
| `Ejecutando Orden` | `<includes>` | `Recibiendo Ruta` |
| `Recargando Batería` | `<includes>` | `Recibiendo Ruta` |
| `Procesando Órdenes` | `<includes>` | `Acoplándose a Muelle` |

### 3.5. Relación `extends` representada en el diagrama

| Caso de uso extensor | Relación | Caso de uso extendido |
|---|---:|---|
| `Creando Paquete` | `<extends>` | `Descargando Paquete` |

### 3.6. Actores declarados en las especificaciones detalladas

| Caso de uso | Actor declarado |
|---|---|
| `Acoplándose a Muelle` | `Camión` |
| `Procesando Órdenes` | `Camión` |
| `Recibiendo Orden` | `Robot` |
| `Recibiendo Ruta` | `Robot` |
| `Cargando Paquete` | `Robot` |
| `Descargando Paquete` | `Robot` |
| `Creando Paquete` | `Robot` |
| `Recargando Batería` | `Robot` |
| `Ejecutando Orden` | `Robot` |

---

## 4. Modelo conceptual / diagrama de clases

### 4.1. Entidades principales

| Entidad | Estereotipo | Atributos |
|---|---|---|
| `Almacén` | `<< entity >>` | `largo: int`, `ancho: int` |
| `Celda` | `<< entity >>` | `x: int`, `y: int` |
| `Robot` | `<< entity >>` | `id: string`, `estadoRobot: enum`, `batería: int`, `estrategia: enum`, `bloqueos: int` |
| `Orden` | `<< entity >>` | `id: string`, `estadoOrden: enum` |
| `Paquete` | `<< entity >>` | `id: string`, `peso: float` |
| `Camión` | `<< entity >>` | `id: string` |

### 4.2. Enumeraciones

#### `EstadoRobot`

- `Inactivo`
- `Operando`
- `Batería baja`
- `Recargando`

#### `Estrategia`

- `Movimiento L`
- `A*`

#### `EstadoOrden`

- `Pendiente`
- `Completada`

### 4.3. Especializaciones / generalizaciones

#### Especializaciones de `Celda`

- `Muelle`
- `Pasillo`
- `Base de Carga`
- `Estantería`

#### Especializaciones de `Camión`

- `Recepción`
- `Despacho`

#### Especializaciones de `Paquete`

| Subtipo de `Paquete` | Atributos específicos |
|---|---|
| `Comestible` | `fecha vencimiento: Date` |
| `General` | Sin atributos específicos indicados en el diagrama |

### 4.4. Asociaciones y multiplicidades del modelo conceptual

| Asociación / rol | Extremo A | Multiplicidad A | Extremo B | Multiplicidad B |
|---|---|---:|---|---:|
| `hecho_de` | `Almacén` | `1` | `Celda` | `*` |
| `ruta` | `Celda` | `*` | `Robot` | `*` |
| `esta_en` | `Celda` | `1` | `Robot` | `0,1` |
| `reservado_a` | `Muelle` | `0,1` | `Robot` | `0,1` |
| `reservada_a` | `Estantería` | `0,1` | `Robot` | `0,1` |
| `guarda` | `Estantería` | `0,1` | `Paquete` | `0,1` |
| `carga` | `Robot` | `0,1` | `Paquete` | `0,1` |
| `asignada_a` | `Orden` | `0,1` | `Robot` | `0,1` |
| `corresponde_a` | `Orden` | `1, 2` | `Paquete` | `1` |
| `asociado_a` | `Camión` | `1` | `Orden` | `*` |
| `acoplado_en` | `Camión` | `0,1` | `Muelle` | `0,1` |

### 4.5. Lectura declarativa de asociaciones principales

- Un `Almacén` está hecho de muchas `Celda`.
- Cada `Celda` pertenece a un único `Almacén`.
- Un `Robot` puede tener una ruta compuesta por varias `Celda`.
- Una `Celda` puede estar en rutas de varios `Robot`.
- Un `Robot` está en una `Celda`.
- Una `Celda` puede tener cero o un `Robot` ubicado en ella.
- Un `Muelle` puede estar reservado a cero o un `Robot`.
- Un `Robot` puede tener cero o un `Muelle` reservado.
- Una `Estantería` puede estar reservada a cero o un `Robot`.
- Un `Robot` puede tener cero o una `Estantería` reservada.
- Una `Base de Carga` no se reserva; su exclusión se determina únicamente por
  ocupación física.
- Una `Estantería` guarda cero o un `Paquete`.
- Un `Paquete` puede estar guardado en cero o una `Estantería`.
- Un `Robot` carga cero o un `Paquete`.
- Un `Paquete` puede estar cargado por cero o un `Robot`.
- Una `Orden` puede estar asignada a cero o un `Robot`.
- Un `Robot` puede tener cero o una `Orden` asignada.
- Una `Orden` corresponde a `1` `Paquete`.
- Un `Paquete` corresponde a `1` o `2` `Orden`.
- Un `Camión` está asociado a muchas `Orden`.
- Cada `Orden` está asociada a un único `Camión`.
- Un `Camión` puede estar acoplado en cero o un `Muelle`.
- Un `Muelle` puede tener cero o un `Camión` acoplado.

---

## 5. Diagramas de estados

## 5.1. Diagrama de estados de `Robot`

### Estados

- `INACTIVO`
- `OPERANDO`
- `BATERÍA BAJA`
- `RECARGANDO`

### Transiciones

| Estado origen | Evento / condición | Estado destino |
|---|---|---|
| `INACTIVO` | `Recibir Orden` | `OPERANDO` |
| `OPERANDO` | `Completar Orden` | `INACTIVO` |
| `INACTIVO` | `Batería = min. necesaria para llegar a base de carga` | `BATERÍA BAJA` |
| `OPERANDO` | `Batería = min. necesaria para llegar a base de carga` | `BATERÍA BAJA` |
| `BATERÍA BAJA` | `Llegada a base de carga` | `RECARGANDO` |
| `RECARGANDO` | `Batería = 100 y sin orden asignada` | `INACTIVO` |
| `RECARGANDO` | `Batería = 100 y orden asignada` | `OPERANDO` |

---

## 5.2. Diagrama de estados de `Camión`

### Estados

- `ACOPLADO`
- `TRABAJANDO`
- `RETIRADO`

### Transiciones

| Estado origen | Evento / condición | Estado destino |
|---|---|---|
| `ACOPLADO` | `Órdenes liberadas` | `TRABAJANDO` |
| `TRABAJANDO` | `Órdenes completadas` | `RETIRADO` |

---

## 6. Diagrama de actividad general del proceso

### 6.1. Andariveles representados

- `Camión`
- `Sistema`
- `Robot`
- `Sistema`
- `Camión`

### 6.2. Flujo principal

1. Inicio.
2. `Camión`: `Acoplar a Muelle`.
3. `Sistema`: `Procesar Órdenes`.
4. `Sistema`: `Asignar Orden`.
5. `Robot`: `Ejecutar Orden`.
6. `Sistema`: decisión `¿Quedan órdenes?`.
   - Si `SÍ`: vuelve a `Asignar Orden`.
   - Si `NO`: continúa con la decisión `¿Muelle ocupado?`.
7. `Camión`: `Desacoplar muelle`
8. Fin.

---

## 7. Diagrama de actividad: `Ejecutar Orden`

### 7.1. Inicio del flujo

1. Inicio.
2. `Recibir Orden`.
3. `Recibir Ruta`.
4. Decisión: `¿Batería suficiente?`.

### 7.2. Rama: batería insuficiente

1. Si `¿Batería suficiente?` = `NO`:
   1. `Recibir ruta a base de carga`.
   2. `Ir a base de carga`.
   3. Si la base está ocupada, esperar sin consumir batería.
   4. `Cargar batería`.
   5. Vuelve a `Recibir Ruta`.

### 7.3. Rama: batería suficiente

1. Si `¿Batería suficiente?` = `SÍ`:
   1. Decisión: `¿Próxima celda ocupada?`.

### 7.4. Rama: próxima celda ocupada

1. Si `¿Próxima celda ocupada?` = `SÍ`:
   1. `Actualizar bloqueos`.
   2. Decisión: `¿Bloqueos = 3?`.
      - Si `SÍ`: `Cambiar estrategia` y vuelve a `Recibir Ruta`.
      - Si `NO`: vuelve a `¿Batería suficiente?`.

### 7.5. Rama: próxima celda no ocupada

1. Si `¿Próxima celda ocupada?` = `NO`:
   1. `Restablecer bloqueos`.
   2. `Mover a próxima celda en ruta`.
   3. Decisión: `¿Celda es destino?`.
      - Si `NO`: vuelve al control del recorrido y se verifica nuevamente `¿Batería suficiente?`.
      - Si `SÍ`: continúa con `¿Con carga?`.

### 7.6. Decisión: `¿Con carga?`

1. Si `¿Con carga?` = `NO`:
   1. `Cargar Paquete`.
   2. Vuelve a `Recibir Ruta`.
2. Si `¿Con carga?` = `SÍ`:
   1. Continúa con la decisión `¿Existe paquete?`.

### 7.7. Continuación del flujo de descarga

1. Decisión: `¿Existe paquete?`.
   - Si `NO`: `Crear Paquete` y luego `Descargar Paquete`.
   - Si `SÍ`: `Descargar Paquete`.
2. `Desocupar celda`.
3. Fin.

---

## 8. Trazabilidad entre diagramas y casos de uso

### 8.1. Casos de uso utilizados como acciones en diagramas de actividad

| Acción del diagrama de actividad | Caso de uso relacionado |
|---|---|
| `Acoplar a Muelle` | `Acoplándose a Muelle` |
| `Procesar Órdenes` | `Procesando Órdenes` |
| `Asignar Orden` | `Recibiendo Orden` |
| `Ejecutar Orden` | `Ejecutando Orden` |
| `Recibir Orden` | `Recibiendo Orden` |
| `Recibir Ruta` | `Recibiendo Ruta` |
| `Cargar Paquete` | `Cargando Paquete` |
| `Crear Paquete` | `Creando Paquete` |
| `Descargar Paquete` | `Descargando Paquete` |
| `Recibir ruta a base de carga` | `Recibiendo Ruta` aplicado a base de carga |
| `Cargar batería` | `Recargando Batería` |

### 8.2. Estados conectados con casos de uso

| Entidad | Caso de uso / acción | Cambio de estado representado |
|---|---|---|
| `Robot` | `Recibir Orden` | `INACTIVO` -> `OPERANDO` |
| `Robot` | `Completar Orden` | `OPERANDO` -> `INACTIVO` |
| `Robot` | batería mínima para llegar a base de carga | `INACTIVO` o `OPERANDO` -> `BATERÍA BAJA` |
| `Robot` | llegada a base de carga | `BATERÍA BAJA` -> `RECARGANDO` |
| `Robot` | batería recuperada sin orden asignada | `RECARGANDO` -> `INACTIVO` |
| `Robot` | batería recuperada con orden asignada | `RECARGANDO` -> `OPERANDO` |
| `Camión` | órdenes liberadas | `ACOPLADO` -> `TRABAJANDO` |
| `Camión` | órdenes completadas | `TRABAJANDO` -> `RETIRADO` |

---

## 9. Elementos nominales del dominio extraídos de los diagramas

### 9.1. Actores / agentes externos al límite del sistema

- `Robot`
- `Camión`

### 9.2. Entidades del modelo conceptual

- `Almacén`
- `Celda`
- `Robot`
- `Orden`
- `Paquete`
- `Camión`
- `Muelle`
- `Pasillo`
- `Base de Carga`
- `Estantería`
- `Recepción`
- `Despacho`
- `Comestible`
- `General`

### 9.3. Estados nominales

#### Estados de robot

- `INACTIVO`
- `OPERANDO`
- `BATERÍA BAJA`
- `RECARGANDO`

#### Estados de camión

- `ACOPLADO`
- `TRABAJANDO`
- `RETIRADO`

#### Estados de orden

- `Pendiente`
- `Completada`

### 9.4. Estrategias nominales

- `Movimiento L`
- `A*`

---

## 10. Aclaraciones vinculantes de diseño y comportamiento

### 10.1. Construcción del almacén

- El almacén no puede existir antes de definir dimensiones, estanterías,
  muelles y bases con sus posiciones.
- Debe existir al menos una base de carga.
- Las posiciones especiales no pueden superponerse.
- Cada robot debe poseer batería inicial suficiente para alcanzar alguna base.

### 10.2. Ocupación y reservas

- Cada celda mantiene un atributo booleano `ocupada`.
- La ocupación representa exclusivamente la presencia física de un robot.
- El almacén administra la ocupación, pero no registra ni contiene robots.
- Solo estanterías y muelles admiten reservas operativas.
- Una reserva no vuelve intransitable una celda.
- Las bases de carga no admiten reservas.

### 10.3. Responsabilidad del robot

- El robot conoce posición, batería, ruta, carga, bloqueos, estrategia y estado.
- Recibe una ruta y ejecuta como máximo el siguiente paso.
- Si la próxima celda está ocupada, conserva posición, ruta y batería y
  actualiza sus bloqueos.
- El robot actualiza su batería al moverse o recargar.
- Puede cargar y descargar paquetes, pero no crearlos.
- Las transiciones, fases, recargas y despejes son decididos por un controlador
  especializado.

### 10.4. Despeje

- El despeje no constituye un estado adicional.
- Un robot que despeja permanece `INACTIVO`.
- Una nueva orden cancela el despeje y reemplaza su ruta.
- El despeje se evalúa preventivamente contra la batería mínima necesaria para
  llegar a una base.

### 10.5. Batería preventiva

- La suficiencia se calcula con distancia Manhattan.
- El costo es `1` sin carga y `2` con carga.
- El robot cambia a `BATERIA_BAJA` cuando su batería es igual o inferior a la
  energía mínima requerida.
- Esta regla aplica tanto a robots `OPERANDO` como `INACTIVO`.
- Una ruta a carga debe asignarse antes de que el robot pierda la capacidad de
  llegar a la base.
- Esperar por una base ocupada no consume batería.
- Una insuficiencia imposible de recuperar constituye un error de dominio.

### 10.6. Camiones y órdenes

- `GestorCamiones` se limita a acople, desacople, registro y colas FIFO.
- El procesamiento del manifiesto y la creación de órdenes son
  responsabilidades separadas.
- Cada `Orden` mantiene una asociación inmutable con el `Camion` del que
  proviene.

### 10.7. Navegación

- El cálculo de ruta recibe origen, destino y estrategia.
- El resultado distingue entre estar en destino, obtener una ruta y no
  encontrar camino.
- Al tercer bloqueo se alterna la estrategia y se recalcula el objetivo.
- Un camino temporalmente bloqueado se reintenta en ticks posteriores.
