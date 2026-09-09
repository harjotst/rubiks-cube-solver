/**
 * Solver worker: builds the pattern databases once, then answers solve
 * requests. Runs off the main thread so the page never freezes.
 */
import { buildTables } from '../src/tables.js';
import { Solver } from '../src/solver.js';

let solver = null;

self.onmessage = (event) => {
  const msg = event.data;
  if (msg.type === 'init') {
    const started = performance.now();
    try {
      const tables = buildTables((stage, done, total) => self.postMessage({ type: 'progress', stage, done, total }));
      solver = new Solver(tables);
      self.postMessage({
        type: 'ready',
        buildMs: performance.now() - started,
        depths: tables.depths,
      });
    } catch (err) {
      self.postMessage({ type: 'fatal', message: err.message });
    }
  } else if (msg.type === 'solve') {
    if (!solver) {
      self.postMessage({ type: 'error', id: msg.id, message: 'The solver is still starting up.' });
      return;
    }
    try {
      const result = solver.solve(Uint8Array.from(msg.stickers), msg.options || {});
      self.postMessage({ type: 'result', id: msg.id, result });
    } catch (err) {
      self.postMessage({ type: 'error', id: msg.id, message: err.message });
    }
  }
};
