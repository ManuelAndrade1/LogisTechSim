import { Simulador } from './src/application/Simulador';

const sim = new Simulador();
sim.init();

console.log("Got estado. Stringifying...");
try {
  const data = sim.getEstadoActual();
  console.log("Data keys:", Object.keys(data));
  const str = JSON.stringify(data);
  console.log("Success! Length:", str.length);
} catch (e) {
  console.error("Error!", e);
}
