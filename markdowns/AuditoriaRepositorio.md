# Auditoria completa del repositorio

Fecha: 2026-06-18

## Alcance revisado

- Se revisaron todos los archivos versionados (`git ls-files`) y los archivos relevantes no versionados del workspace (`.npmrc`, `backend/.npmrc`, `frontend/.npmrc`, `frontend/src/utils/robotVisualIdentity.ts`).
- Se excluyeron dependencias y caches generados: `node_modules/`, `.npm-cache/` y `.git/`.
- Se inspeccionaron backend, frontend, tests, CSVs, lockfiles, configs y markdowns.

## Arquitectura y flujo

El backend esta organizado en capas:

- Dominio: entidades (`Robot`, `Almacen`, `Orden`, `Camion`, `Paquete`), celdas, reservas, navegacion y registros.
- Aplicacion: asignacion de ordenes, orquestacion de robots, recarga, transferencias, procesamiento de manifiestos y snapshot.
- Infraestructura: CSV, entorno de simulacion, Express y observer de logs.

Flujo por tick:

1. `SimuladorEntorno.avanzarTick()` incrementa el reloj externo e inyecta camiones cuyo `tickLlegada` coincide.
2. `ControladorAlmacen.procesarPaso()` incrementa el tick interno.
3. `ProcesadorPasoSimulacion` registra manifiestos habilitados, prioriza ordenes, asigna reservas, prepara rutas/recargas/despejes, ejecuta un paso por robot, procesa bloqueos, mueve paquetes, recarga y retira camiones completos.
4. `MapeadorEstadoAlmacen` proyecta el estado para el frontend.

Los robots reciben tareas en `AsignadorOrdenes`: se buscan origen/destino, se elige un robot disponible, se reservan origen y destino y se asigna la orden. Los paquetes de recepcion existen primero como `Paquete` preliminar sin `id` fisico; se materializan al descargarse en una estanteria. Los paquetes de despacho se vinculan a una estanteria existente y se retiran fisicamente al cargar el robot.

## Hallazgos

### 1. High - Ordenes de autonomia exacta se rechazan aunque son posibles

- Archivo: `backend/src/application/robots/PoliticaBateria.ts:20-25`
- Descripcion: `debeRecargarParaOrden` lanza error cuando `energia >= 100` y el robot tiene bateria 100. Si la energia requerida es exactamente 100, la tarea es alcanzable usando toda la autonomia, pero se trata como imposible.
- Escenario: robot con bateria 100, orden cuya energia restante total es 100. En vez de ejecutar, se lanza `La orden ... supera la autonomia maxima`.
- Fix recomendado: cambiar la condicion a `energia > 100` y agregar test de frontera para energia `99`, `100` y `101`.

### 2. High - La bateria de ordenes se valida con Manhattan, no con la ruta real

- Archivos: `backend/src/application/robots/PoliticaBateria.ts:28-35`, `backend/src/application/robots/OrquestadorRobots.ts:76-80`, `backend/src/domain/entities/Robot.ts:124-126`
- Descripcion: la politica calcula energia con distancia Manhattan, pero la ruta real puede ser mas larga por bloqueos y A*. El robot puede aceptar una orden, desviarse por una ruta mas costosa y quedarse sin bateria en medio del trabajo.
- Escenario: varios robots ocupan el camino directo. A* encuentra un rodeo viable pero mas largo que Manhattan; la orden se asigna, el robot consume mas energia que la estimada y termina lanzando error al intentar moverse.
- Fix recomendado: calcular o estimar con la ruta real antes de confirmar la actividad, validar costo de `pasos.length * costo`, y hacer rollback o desviar a recarga si la ruta efectiva no es viable.

### 3. High - Dos robots pueden quedar bloqueados permanentemente

- Archivos: `backend/src/domain/navigation/AStar.ts:37-39`, `backend/src/domain/navigation/MovimientoL.ts:16-24`, `backend/src/application/robots/OrquestadorRobots.ts:44-58`
- Descripcion: al tercer bloqueo solo se alterna la estrategia. A* permite que el destino este ocupado, por lo que dos robots que quieren intercambiar posiciones pueden recalcular rutas hacia celdas ocupadas y bloquearse indefinidamente.
- Escenario: R1 esta en A y su objetivo es B; R2 esta en B y su objetivo es A. Ambos se bloquean, alternan estrategia, vuelven a intentar entrar al destino ocupado y no hay mecanismo de prioridad, cesion o estacionamiento intermedio.
- Fix recomendado: agregar resolucion de conflictos: reservas temporales por tick, prioridad/yield, rutas con tiempo, o desvio obligatorio a pasillo libre cuando el destino esta ocupado por otro robot.

### 4. Medium - Despachos sin stock quedan pendientes para siempre

- Archivos: `backend/src/application/orders/OrquestadorOrdenes.ts:14-25`, `backend/src/application/orders/AsignadorOrdenes.ts:71-77`, `backend/src/application/trucks/RetiradorCamionesCompletos.ts:6-9`
- Descripcion: una orden de despacho solo es elegible si existe una estanteria con el paquete. Si el paquete nunca aparece, la orden permanece pendiente y el camion nunca se retira. No existe estado `FALLIDA`, timeout ni diagnostico.
- Escenario: llega un camion de `DESPACHO` con `paqueteId=PX`, pero ningun camion de recepcion crea `PX`. La simulacion puede avanzar infinitamente sin progreso.
- Fix recomendado: validar manifiestos contra inventario inicial/entrante cuando sea posible, o agregar estado de bloqueo/fallo visible con motivo y tests para despacho sin stock.

### 5. Medium - Cero robots o todos ocupados no tienen estado terminal ni diagnostico

- Archivos: `backend/src/application/simulation/InicializadorSimulacion.ts:32-35`, `backend/src/application/orders/AsignadorOrdenes.ts:17-23`
- Descripcion: el sistema permite inicializar cero robots. Si hay ordenes, `buscarRobot` devuelve `null` y `asignar` retorna, dejando ordenes/camiones pendientes indefinidamente.
- Escenario: mapa valido con un camion de recepcion y `robotsConfig=[]`. Las ordenes se registran, pero ningun tick posterior puede avanzar la operacion.
- Fix recomendado: rechazar configuraciones sin robots cuando existan camiones/ordenes, o exponer estado `SIN_RECURSOS`/`BLOQUEADA` para que la simulacion no parezca viva sin progreso.

### 6. Medium - Tick y reinicio no son transaccionales

- Archivos: `backend/src/infrastructure/SimuladorEntorno.ts:68-85`, `backend/src/application/ControladorAlmacen.ts:29-38`, `backend/src/index.ts:35-49`
- Descripcion: el tick se incrementa y se mutan llegadas/manifiestos antes de completar todo el paso. Si una excepcion ocurre en mitad del tick, quedan mutaciones parciales.
- Escenario: llega un camion, se remueve de `camionesPendientes`, luego una validacion de orden falla durante `procesarPaso`. El reloj ya avanzo y parte del estado cambio.
- Fix recomendado: validar antes de mutar, o encapsular cada tick en una transaccion/snapshot con rollback. En API, capturar errores y devolver respuesta controlada sin dejar el entorno a medias.

### 7. Medium - Carga/descarga de paquetes no tiene rollback local

- Archivos: `backend/src/application/transfers/GestorTransferencias.ts:50-55`, `backend/src/application/transfers/GestorTransferencias.ts:71-81`, `backend/src/application/packages/GestorPaquetes.ts:21-27`
- Descripcion: en despacho se retira el paquete de la estanteria antes de cargarlo en el robot. En recepcion se materializa/guarda antes de completar orden y contexto. Si una excepcion inesperada aparece entre mutaciones, puede quedar paquete perdido o estado divergente.
- Escenario: por corrupcion previa, `robot.cargar` falla despues de `retirarPaquete`; el paquete ya no esta en la estanteria ni en el robot.
- Fix recomendado: validar todas las precondiciones antes de mutar, agrupar mutaciones en una operacion atomica con rollback, y agregar tests que simulen fallas intermedias.

### 8. Medium - Validacion CSV insuficiente y datos huerfanos silenciosos

- Archivos: `backend/src/infrastructure/factories/CSVLoader.ts:51-77`, `backend/src/infrastructure/factories/CSVLoader.ts:89-114`, `backend/src/infrastructure/SimuladorEntorno.ts:45-52`
- Descripcion: filas desconocidas se ignoran, dimensiones faltantes usan `10x10`, `tick_llegada` invalido puede quedar como `NaN`, y ordenes cuyo `id_camion` no existe se descartan silenciosamente al agrupar por camion.
- Escenario: `ordenes.csv` contiene una orden para `C99` inexistente. La simulacion carga sin error y esa orden desaparece del sistema.
- Fix recomendado: validar esquema completo de cada CSV, rechazar numeros no finitos, exigir exactamente una fila de dimensiones y verificar que toda orden pertenezca a un camion declarado.

### 9. Medium - IDs de paquete duplicados pueden crear inventario imposible

- Archivos: `backend/src/application/orders/RegistroOrdenes.ts:11-19`, `backend/src/application/packages/GestorPaquetes.ts:21-27`, `backend/src/domain/entities/Almacen.ts:122-125`
- Descripcion: solo se valida duplicidad de ordenes. Dos ordenes de recepcion con el mismo `paqueteId` pueden materializar dos paquetes fisicos con el mismo id. Luego `buscarEstanteriaConPaquete` devuelve la primera coincidencia y el inventario queda ambiguo.
- Escenario: dos camiones de recepcion traen `P1`; ambos paquetes se guardan con id fisico `P1`. Un despacho de `P1` no puede distinguir cual retirar.
- Fix recomendado: agregar registro global de paquetes fisicos/planificados y rechazar duplicados, o modelar cantidades/lotes explicitamente.

### 10. Medium - `/api/restart` acepta nombres arbitrarios y puede dejar `simActual` corrupto

- Archivos: `backend/src/index.ts:35-38`, `backend/src/infrastructure/SimuladorEntorno.ts:27-34`, `backend/src/infrastructure/SimuladorEntorno.ts:61-63`
- Descripcion: `init` asigna `simActual` antes de comprobar que los CSV existen. Un `sim` invalido provoca error de lectura y deja el nombre invalido como simulacion actual para futuros resets.
- Escenario: `POST /api/restart` con `{ "sim": "no-existe" }`. La lectura falla, pero `simActual` ya fue cambiado; un reinicio sin `sim` vuelve a intentar la simulacion invalida.
- Fix recomendado: validar `sim` contra la lista de subdirectorios, construir/cargar en variables temporales y solo actualizar `simActual` al final exitoso.

### 11. Low - Frontend puede mostrar estado viejo por ticks concurrentes

- Archivos: `frontend/src/App.tsx:51-54`, `frontend/src/App.tsx:88-94`, `frontend/src/App.tsx:120-125`
- Descripcion: `avanzarTick` no espera `fetchEstado`, y Auto-Play dispara cada 800 ms sin guard de request en curso. Respuestas HTTP fuera de orden pueden sobrescribir estado mas nuevo con uno viejo.
- Escenario: backend lento o usuario hace clicks rapidos en `Avanzar Tick`; un `fetchEstado` anterior responde despues de otro y pisa el estado mostrado.
- Fix recomendado: usar guard `isAdvancing`, `await fetchEstado()`, abortar requests obsoletos o secuenciar por numero de tick antes de hacer `setEstado`.

### 12. Low - El grid oculta colisiones y escala mal

- Archivo: `frontend/src/components/AlmacenGrid.tsx:17-23`, `frontend/src/components/AlmacenGrid.tsx:43-56`
- Descripcion: por cada celda se hacen busquedas lineales con `.find`. Si dos robots comparten posicion por un bug backend, solo se renderiza el primero y la colision queda invisible.
- Escenario: estado invalido con dos robots en `(2,2)`; la UI muestra un solo robot y dificulta detectar el problema.
- Fix recomendado: precomputar mapas por posicion, detectar multiplicidad y renderizar un indicador de colision/error.

### 13. Low - Script de lint inexistente

- Archivo: `frontend/package.json:7-10`, `frontend/package.json:17-23`
- Descripcion: el script `lint` invoca `eslint`, pero `eslint` no esta en `devDependencies` ni hay configuracion visible.
- Escenario: `npm run lint --prefix frontend` falla aunque el script exista.
- Fix recomendado: agregar ESLint y config, o eliminar el script si no se va a usar.

### 14. Low - Archivo muerto fuera de TypeScript estricto

- Archivos: `backend/test_json.ts:1-4`, `backend/tsconfig.json:11`
- Descripcion: `backend/test_json.ts` importa `./src/application/Simulador`, que no existe. No falla en CI porque `tsconfig` solo incluye `src/**/*` y `tests/**/*`.
- Escenario: compilar puntualmente `backend/test_json.ts` produce `TS2307`.
- Fix recomendado: borrar el archivo o actualizarlo para usar `SimuladorEntorno`/`ControladorAlmacen`, e incluir scripts sueltos en chequeos si se mantienen.

### 15. Low - Artefactos y basura de entorno en el repositorio

- Archivos: `.DS_Store`, `.gitignore:1-2`
- Descripcion: `.DS_Store` esta versionado y `.gitignore` solo ignora `node_modules` y `.npm-cache`. No ignora `dist`, `.DS_Store` ni otros outputs comunes.
- Escenario: builds o archivos de sistema pueden terminar en commits por accidente.
- Fix recomendado: eliminar `.DS_Store` del indice y ampliar `.gitignore` con `.DS_Store`, `dist/`, logs y outputs temporales.

### 16. Medium - Cobertura de tests insuficiente para casos adversos

- Archivos: `backend/tests/controlador.test.ts:278-324`, `backend/tests/dominio.test.ts:188-205`
- Descripcion: las suites actuales pasan y cubren flujos felices largos, rollback basico y bloqueos simples, pero no prueban los escenarios que mas romperian la simulacion.
- Escenario: no hay tests para energia exacta 100, ruta real mas larga que Manhattan, deadlocks por intercambio de posiciones, cero robots, despacho sin stock, CSV invalido, paquetes duplicados ni API restart invalida.
- Fix recomendado: agregar tests unitarios y de integracion para cada hallazgo High/Medium anterior, incluyendo asserts de no progreso y mensajes de error esperados.

## Respuestas a preguntas criticas

- Dos robots no deberian reservar el mismo recurso normal: `CeldaReservable` lo impide, y `AsignadorOrdenes` revierte conflictos. Riesgo residual: IDs de paquete duplicados vuelven ambiguo que paquete se busca.
- Un paquete puede quedar perdido solo ante corrupcion o excepcion intermedia en transferencias; el flujo feliz no lo pierde, pero no hay rollback robusto.
- Un robot si puede quedar permanentemente bloqueado en escenarios de intercambio/ocupacion de destino.
- Una tarea no se ejecuta dos veces en el flujo normal, pero `Orden.completar()` no rechaza una segunda llamada si se invoca con `robotId` aun seteado.
- Las colas FIFO de camiones funcionan en happy path, pero no hay estado de fallo para ordenes imposibles.
- Contadores de bateria no se vuelven negativos por clamp, pero la simulacion puede lanzar antes por bateria insuficiente.
- Con cero robots o paquetes faltantes, la simulacion puede quedar viva pero sin progreso.
- Eventos simultaneos se serializan por id/tick, lo que evita races reales en Node, pero no resuelve deadlocks logisticos.

## Verificacion ejecutada

- `npm test --prefix backend`: pasa, 20 tests.
- `./frontend/node_modules/.bin/tsc --noEmit -p frontend/tsconfig.json`: pasa.
- `./backend/node_modules/.bin/tsc --noEmit -p backend/tsconfig.json`: pasa.
- `./backend/node_modules/.bin/tsc --noEmit --target ES2022 --module CommonJS --esModuleInterop --skipLibCheck backend/test_json.ts`: falla con `TS2307`, confirmando archivo muerto.

