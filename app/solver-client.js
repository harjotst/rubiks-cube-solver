/**
 * Promise-based front for the solver worker, with a main-thread fallback
 * for browsers that cannot run module workers.
 */

export class SolverClient {
  /**
   * @param {object} hooks
   * @param {(stage: string, done: number, total: number) => void} hooks.onProgress
   * @param {(info: {buildMs: number, depths: object, inWorker: boolean}) => void} hooks.onReady
   * @param {(message: string) => void} hooks.onFatal
   */
  constructor(hooks) {
    this.hooks = hooks;
    this.pending = new Map();
    this.nextId = 1;
    this.ready = false;
    this.worker = null;
    this.fallback = null;
  }

  start() {
    let worker;
    try {
      worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    } catch (err) {
      this.startFallback();
      return;
    }
    this.worker = worker;
    const failTimer = setTimeout(() => {
      if (!this.ready) this.abandonWorker('The solver worker did not start in time.');
    }, 20000);
    worker.onerror = (event) => {
      if (!this.ready) {
        clearTimeout(failTimer);
        this.abandonWorker(event.message || 'The solver worker failed to load.');
      }
    };
    worker.onmessage = (event) => {
      const msg = event.data;
      if (msg.type === 'progress') {
        this.hooks.onProgress(msg.stage, msg.done, msg.total);
      } else if (msg.type === 'ready') {
        clearTimeout(failTimer);
        this.ready = true;
        this.hooks.onReady({ buildMs: msg.buildMs, depths: msg.depths, inWorker: true });
      } else if (msg.type === 'fatal') {
        clearTimeout(failTimer);
        this.abandonWorker(msg.message);
      } else if (msg.type === 'result' || msg.type === 'error') {
        const entry = this.pending.get(msg.id);
        if (!entry) return;
        this.pending.delete(msg.id);
        if (msg.type === 'result') entry.resolve(msg.result);
        else entry.reject(new Error(msg.message));
      }
    };
    worker.postMessage({ type: 'init' });
  }

  abandonWorker(reason) {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    console.warn('Falling back to solving on the main thread:', reason);
    this.startFallback();
  }

  async startFallback() {
    try {
      const [{ buildTables }, { Solver }] = await Promise.all([import('../src/tables.js'), import('../src/solver.js')]);
      const started = performance.now();
      // Yield between stages so the progress bar can paint.
      const tables = await new Promise((resolve) => {
        setTimeout(() => resolve(buildTables((stage, done, total) => this.hooks.onProgress(stage, done, total))), 30);
      });
      this.fallback = new Solver(tables);
      this.ready = true;
      this.hooks.onReady({
        buildMs: performance.now() - started,
        depths: tables.depths,
        inWorker: false,
      });
    } catch (err) {
      this.hooks.onFatal(err.message);
    }
  }

  /**
   * @param {ArrayLike<number>} stickers
   * @param {object} options passed to Solver.solve
   * @returns {Promise<object>} the solver result
   */
  solve(stickers, options) {
    if (!this.ready) return Promise.reject(new Error('The solver is still starting up.'));
    if (this.fallback) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            resolve(this.fallback.solve(Uint8Array.from(stickers), options));
          } catch (err) {
            reject(err);
          }
        }, 20);
      });
    }
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ type: 'solve', id, stickers: Array.from(stickers), options });
    });
  }
}
