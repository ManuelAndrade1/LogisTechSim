# LogisTech Sim - Trabajo Práctico

¡Bienvenido a **LogisTech Sim**! Este es un entorno de simulación interactivo diseñado para visualizar y evaluar algoritmos de gestión de almacenes robotizados.

Tu tarea en este Trabajo Práctico es diseñar e implementar el **modelo de dominio** del almacén (los robots, las estanterías, los camiones y el propio almacén) y programar el cerebro del sistema: el **Controlador del Almacén**.

---

## Estructura del Proyecto

*   **`frontend/`**: Aplicación web desarrollada en React + Vite que visualiza la grilla del almacén, los camiones en los muelles, los racks de estanterías con paquetes, y el movimiento de los robots en tiempo real.
*   **`backend/`**: Servidor Express que actúa como motor de simulación. Se encarga de:
    *   Cargar la configuración de mapas y simulación desde archivos CSV (`backend/data/`).
    *   Gestionar el reloj global de la simulación.
    *   Avanzar los ticks del sistema y notificar eventos (como la llegada de camiones a los muelles).
    *   Exponer endpoints API para que el frontend consulte el estado actual.

---

## Requisitos Previos

Asegúrate de tener instalado:
*   [Node.js](https://nodejs.org/) (versión 18 o superior recomendada)
*   `npm` (instalado automáticamente junto con Node.js)

---

## Instalación y Ejecución

1.  **Instalar dependencias de todo el proyecto (Frontend + Backend):**
    En la raíz de la carpeta `starter-tp/`, ejecuta:
    ```bash
    npm run install-all
    ```

2.  **Iniciar la simulación en modo desarrollo:**
    En la raíz de la carpeta `starter-tp/`, ejecuta:
    ```bash
    npm run dev
    ```
    Este comando levantará concurrentemente:
    *   El backend en `http://localhost:3000`
    *   El frontend en `http://localhost:5173` (o el puerto que te asigne Vite)

3.  **Abrir el navegador:**
    Abre tu navegador en la URL indicada por el frontend (por ejemplo, `http://localhost:5173`).

---

## Consigna de Implementación

Todo el sistema de visualización y simulación ya está implementado. Tu trabajo consiste en desarrollar el **Controlador del Almacén** en:
👉 `backend/src/application/ControladorAlmacen.ts`

### ¿Qué tienes que hacer?
1.  **Diseñar el Modelo de Dominio:** Crea las clases necesarias (ej. `Robot`) dentro de una estructura en `backend/src/domain/`.
    > [!TIP]
    > **Evita el "Modelo de Dominio Anémico":** No uses solo interfaces simples de datos. Tus clases de dominio deben tener **estado mutable** y **comportamiento** (métodos como `mover()`, `cargarBateria()`, `procesarOrden()`).
2.  **Implementar los métodos de `ControladorAlmacen`:**
    *   `inicializar(mapaConfig, robotsConfig)`: Se ejecuta una única vez al iniciar. Recibe la configuración cruda y debes usarla para instanciar tus clases de dominio creadas.
    *   `onCamionLlega(camionDTO)`: Se ejecuta cuando un camión arriba físicamente a un muelle. Debes registrar el camión y sus órdenes en tu sistema.
    *   `procesarPaso()`: **El motor principal.** Es invocado síncronamente por el simulador en cada paso de tiempo (tick). Aquí debes coordinar el movimiento de los robots, asignar tareas, descargar/cargar paquetes, consumir batería y liberar camiones completados.
    *   `obtenerEstado()`: Snapshot del estado del almacén devuelto a la UI.

---

## El Contrato de Datos con el Frontend

Para que la aplicación React pueda renderizar los elementos del almacén de manera automática a medida que avanzas en tu lógica, debes asegurarte de que tu método `obtenerEstado()` en `ControladorAlmacen` devuelva un objeto con la siguiente estructura exacta:

```typescript
{
  dimensiones: { 
    width: number; 
    height: number; 
  },
  robots: Array<{ 
    x: number; 
    y: number; 
    estado: string;     // Ej: 'INACTIVO', 'MOVIMIENTO', 'CARGANDO' (insensible a mayúsculas)
    carga: boolean;     // true si lleva un paquete encima para pintar 📦
  }>,
  camiones: Array<{ 
    x: number; 
    y: number; 
    tipo: 'RECEPCION' | 'DESPACHO'; 
  }>,
  estanterias: Array<{ 
    x: number; 
    y: number; 
    paquetes: Array<any>; // Si tiene elementos, se renderizará con un paquete 📦
  }>,
  basesCarga?: Array<{  // Opcional, para pintar las bases de recarga ⚡
    x: number; 
    y: number; 
  }>
}
```

---

## Ventajas de la Simulación Síncrona

El método `procesarPaso()` es ejecutado de forma síncrona por el simulador. Esto te permite:
*   **Depurar paso a paso:** Pausar la simulación en el frontend y usar el botón **"Avanzar Tick"** para observar con precisión cómo se mueven tus robots una celda a la vez.
*   **Escribir pruebas unitarias:** Puedes testear la lógica de tus robots y del almacén simplemente llamando a `procesarPaso()` repetidas veces de forma secuencial en tus archivos de test, sin preocuparte por timers asíncronos (`setInterval` o promesas).
