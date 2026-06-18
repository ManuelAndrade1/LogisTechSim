# Simulaciones de casos borde

Estas simulaciones viven en `backend/data/` y siguen el mismo formato que
`sim1` y `sim2`: cada carpeta contiene `almacen.csv`, `camiones.csv` y
`ordenes.csv`.

El objetivo es tener datos reproducibles para probar manualmente la interfaz y
para validar futuras correcciones. Algunas simulaciones deberian progresar con
el codigo actual; otras reproducen limitaciones documentadas en
`markdowns/AuditoriaRepositorio.md` y pueden quedar sin progreso.

Para ver una simulacion nueva en la UI, recargar la pagina para que el frontend
vuelva a consultar `/api/simulaciones`, seleccionarla desde el dropdown y usar
`Reiniciar`.

## Resumen

| Simulacion | Tipo | Objetivo | Resultado esperado actual |
|---|---|---|---|
| `edge-muchos-robots` | Valida / estres | Alta densidad de robots en mapa chico | Debe avanzar sin superposiciones; puede mostrar esperas y bloqueos temporales. |
| `edge-muchas-ordenes` | Valida / estres | Muchas ordenes con pocos robots | Debe procesar una cola larga de recepcion y despacho de forma gradual. |
| `edge-bateria-baja` | Valida / bateria | Robots con bateria limitada | Debe mostrar derivacion a recarga y reanudacion si la autonomia alcanza. |
| `edge-muelles-cola` | Valida / cola FIFO | Varios camiones al mismo muelle | Debe acoplarlos y desacoplarlos en orden FIFO. |
| `edge-despacho-sin-stock` | Reproduccion de bug | Despacho de paquete inexistente | La orden queda pendiente y el camion no se retira. |
| `edge-cero-robots` | Reproduccion de bug | Ordenes sin flota disponible | La simulacion carga, pero no progresa logisticamente. |
| `edge-paquete-duplicado` | Reproduccion de bug | Dos recepciones con el mismo paquete | Puede crear inventario ambiguo con ids fisicos repetidos. |

## Casos validos para demo o regresion manual

### `edge-muchos-robots`

Mapa chico de `6x6` con diez robots, dos muelles, dos bases y cuatro
estanterias centrales.

Que observar:

- Si los robots esperan cuando el camino esta ocupado.
- Si el tablero evita superposiciones visibles.
- Si el sistema mantiene avance aunque haya mucha densidad de flota.

Resultado esperado:

- La simulacion deberia avanzar.
- Puede haber bloqueos temporales y cambios de estrategia.
- No deberia aparecer mas de un robot ocupando fisicamente la misma celda.

### `edge-muchas-ordenes`

Mapa de `12x8` con dos robots y veinticuatro ordenes distribuidas entre
recepciones y despachos.

Que observar:

- Priorizacion de comestibles por vencimiento.
- Trabajo acumulado cuando hay mas ordenes que robots.
- Que los camiones de despacho esperen a que exista stock.

Resultado esperado:

- La simulacion deberia progresar lentamente.
- Las ordenes se completan de a poco por la cantidad limitada de robots.
- Es util para dejar correr auto-play y mirar estabilidad.

### `edge-bateria-baja`

Mapa de `9x7` con dos robots cerca de los muelles, bateria inicial baja y bases
en extremos opuestos.

Que observar:

- Transiciones a `BATERIA_BAJA` y `RECARGANDO`.
- Que esperar por una base ocupada no consuma bateria.
- Que despues de recargar el robot pueda volver a operar o despejar la base.

Resultado esperado:

- La simulacion deberia seguir funcionando si la politica considera viable la
  energia restante.
- Si un robot necesita recargar antes de tomar una orden, debe hacerlo de forma
  visible en el panel de robots.

### `edge-muelles-cola`

Tres camiones de recepcion llegan al mismo muelle en ticks consecutivos, y un
camion de despacho llega despues a otro muelle.

Que observar:

- `C1`, `C2` y `C3` deben ser procesados en orden de llegada en `M1`.
- El siguiente camion se acopla cuando el anterior termina y se retira.
- El despacho posterior deberia esperar a que los paquetes existan.

Resultado esperado:

- La cola por muelle debe respetar FIFO.
- La simulacion permite mostrar acople, trabajo, retiro y siguiente acople.

## Casos que reproducen limitaciones actuales

### `edge-despacho-sin-stock`

Un camion de despacho pide `P404`, pero no existe ningun camion de recepcion que
lo haya ingresado.

Hallazgo relacionado:

- Auditoria, hallazgo 4: despachos sin stock quedan pendientes para siempre.

Resultado esperado actual:

- La simulacion carga.
- La orden queda pendiente indefinidamente.
- El camion no se retira porque no hay estado de fallo o diagnostico visible.

### `edge-cero-robots`

Mapa valido con muelle, base y estanteria, pero sin robots.

Hallazgo relacionado:

- Auditoria, hallazgo 5: cero robots o todos ocupados no tienen estado terminal
  ni diagnostico.

Resultado esperado actual:

- La simulacion inicializa porque el sistema permite flota vacia.
- El camion llega y la orden se registra.
- Ningun tick puede avanzar la operacion.

### `edge-paquete-duplicado`

Dos camiones de recepcion traen el mismo `id_paquete` (`P_DUP`) y luego llega un
camion de despacho que pide ese mismo id.

Hallazgo relacionado:

- Auditoria, hallazgo 9: ids de paquete duplicados pueden crear inventario
  imposible o ambiguo.

Resultado esperado actual:

- La simulacion puede materializar dos paquetes con el mismo id fisico.
- El despacho no puede distinguir semanticamente cual unidad retirar.
- Sirve para validar una futura regla de unicidad o modelado de cantidades.

## Formato recordatorio

`almacen.csv`

```csv
tipo,x,y,extra
dimensiones,10,10,
estanteria,4,4,
muelle,0,3,M1
robot,2,2,100
base_carga,0,0,B1
```

`camiones.csv`

```csv
id_camion,tipo,muelle_id,tick_llegada
C1,RECEPCION,M1,2
```

`ordenes.csv`

```csv
id_orden,id_camion,id_paquete,tipo_paquete,peso,vencimiento
O1,C1,P1,GENERAL,50,
O2,C1,P2,COMESTIBLE,10,2026-12-31
```

Notas:

- Los robots se nombran automaticamente como `R1`, `R2`, etc. segun el orden de
  aparicion en `almacen.csv`.
- `muelle_id` debe existir en `almacen.csv`.
- `id_camion` en `ordenes.csv` debe existir en `camiones.csv` si la orden debe
  participar de la simulacion.
- Las simulaciones de bugs no son fallas de formato: son escenarios validos que
  evidencian comportamiento pendiente de corregir.

