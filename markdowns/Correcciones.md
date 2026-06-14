Modificar la implementacion actual (codigo actual + markdowns de implementacion y especificacion)
siguiendo las siguientes correcciones:

### `ControladorAlmacen`
Dividir las responsabilidades del ControladorAlmacen: Se podria refactorizar el codigo de forma que el controladoerALmacen funcione como un orquestador. El Controlador sabe llamar a alguien que inicializa el almacen (pero no conoce como), el controlador sabe llamar a alguien que procesa el paso segun el tick y el contexto), y el controlador sabe llamar a alguien que procesa el contexto y lo prepara para que lo reciba el front. Es decir, reducimos lo que "sabe hacer" el controlador a simplemente llamar a los responsables y llevar el control del tick interno de la simulacion

### `Almacen`
Refactorizar almacen: agregar un builder de forma que el almacen NO exista hasta que se defina la grilla (width x height), las estanterias, bases de carga y muelles (y sus posiciones). Luego, las responsabilidades del almacen deberian ser: reservar y liberar celdas, chequear si una celda esta ocupada. Para ello, deberia agregarse un atributo booleano a Celda que se llame "ocupada" que debe valer true si esta ocupada por un robot y false en caso contrario. El almacen no deberia tener informacion sobre los robots

### `Robot`
Refactorizar la clase Robot: el robot deberia saber unicamente moverse hacia la siguiente celda en la ruta, validando si esta o no disponible. En caso de no estar disponible, el robot deberia saber tambien actualizar su cantidad de bloqueos. La actualizacion de la bateria (sea para bajar en 1 o 2 unidades o para recargar). La actualizacion de los estados del robot deberia ser manejada por el controlador de los mismos. La iniciacion o cancelacion de despejes deberia ser gestionada por el controlador. El robot solo sabe recibir rutas y ejecutar el siguiente paso en esa ruta. El robot puede cargar y descargar paquetes tambien, pero no puede crearlos.

El robot tambien deberia saber su estrategia de navegacion

### `Celda`
Refactorizar Celda: Las bases de carga NO son reservables. El resto OK.

### `GestorCamiones`
Refactorizar GestorCamiones: El gestor de camiones deberia saber unicamente como acoplar y desacoplar camiones (y mantener las colas correspondientes). Se deberia dividir la responsabilidad de acople y desacople de la responsabilidad de tomar los manifiestos, crear y almacenar las ordenes.

### `Orden`
Las ordenes deberian saber de que camion provienen

### `GestorRecarga`
- EL gestor de recarga siempre le puede asignar una base de carga al robot dado que ya no existen las "reservas' para las bases de carga. 
- El gestor de recarga asigna la base pero no calcula la ruta, de eso se debe encargar el responsable de asignarle rutas al robot. 
- Habria que unificar la gestion de la bateria. Es decir, el mismo responsable de actualizarle la bateria al robot en -1 o -2 deberia ser el mismo que le actualiza la bateria en +10

### OrquestadorRobots
- Esta clase deberia ser el intermediario entre el robot y el entorno. Pero no deberia saber hacer todo.
- Deberia haber una entidad/clase que sepa calcular rutas en base a una posicion origen, otra de destino, y una estrategia de navegacion.
- El orquestador de robots sabe llamar a otros actores como el calculador de rutas, el gestor de recargas, y otros para poder actualizar los estados y rutas del robot. 
- El despeje posterior se trata como una etapa posterior al cambio de estado entre operando e inactivo. No es un estado mas, sino que es una ruta que sigue el robot mientras esta inactivo

### Correcciones sobre supuestos

#### 1. Cambio de estados
El diagrama permite pasar de INACTIVO a BATERIA_BAJA por batería mínima. En el código un robot inactivo sin orden no inicia recarga por batería baja. La recarga se evalúa al tener una orden cuya energía estimada no puede cubrir.

Esto no deberia suceder dado que un robot en estado inactivo puede estar realizando el despeje y quedarse con bateria baja en el proceso, de forma que no podria llegar a una base de carga en el futuro

#### 2. Asignacion de ruta a base de carga
Si sí hay base pero no tiene batería suficiente para llegar, puede quedar en BATERIA_BAJA sin poder mover ni comenzar a recargar.

Esto NUNCA deberia pasar, siempre se deberia actualizar la ruta de un robot a tiempo para que pueda llegar a la base de carga. No deberia haber problemas si la base esta ocupada dado que los robots UNICAMENTE Pierden bateria al moverse. Si un robot llega a una base de carga ocupada y se debe quedar esperando, no pierde bateria dado que no se mueve de su sitio hasta que la base de recarga se libere

### Detalles de implementacion
La implementacion deberia separar en archivos y carpetas coherentes el codigo 
de forma que se pueda identificar rapidamente a que clase o entidad corresponde cada archivo.
Una regla sencilla (pero no necesariamente a seguir a rajatabla) es: "Una clase, un archivo".