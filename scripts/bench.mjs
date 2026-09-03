/**
 * Solve a batch of random cubes and report move counts and timings.
 *   node scripts/bench.mjs [count] [maxLength] [timeLimitMs]
 */
import { buildTables } from '../src/tables.js';
import { Solver } from '../src/solver.js';
import { randomState, mulberry32 } from '../src/scramble.js';

const count = Number(process.argv[2] || 100);
const maxLength = Number(process.argv[3] || 22);
const timeLimitMs = Number(process.argv[4] || 2000);

let t0 = performance.now();
const tables = buildTables();
console.log(`tables built in ${(performance.now() - t0).toFixed(0)} ms`);
console.log(`pattern database depths: twist×slice ${tables.depths.twistSlice}, flip×slice ${tables.depths.flipSlice}, cornerPerm×slice ${tables.depths.cornerSlice}, edgePerm×slice ${tables.depths.edgeSlice}`);

const solver = new Solver(tables);
const rng = mulberry32(2024);
const lengths = [];
const times = [];
let nodes = 0;
for (let i = 0; i < count; i++) {
  const state = randomState(rng);
  const r = solver.solve(state, { maxLength, timeLimitMs });
  if (!state.clone().applyMoves(r.moves).isSolved()) throw new Error('solution does not solve the cube');
  lengths.push(r.length);
  times.push(r.elapsedMs);
  nodes += r.nodes;
}
const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const histogram = {};
for (const l of lengths) histogram[l] = (histogram[l] || 0) + 1;
console.log(`${count} random states, target ≤ ${maxLength} moves, time limit ${timeLimitMs} ms`);
console.log(`moves: avg ${avg(lengths).toFixed(2)}, min ${Math.min(...lengths)}, max ${Math.max(...lengths)}`);
console.log(`time:  avg ${avg(times).toFixed(0)} ms, max ${Math.max(...times).toFixed(0)} ms, ${(nodes / count / 1000).toFixed(0)}k nodes per solve`);
console.log('length histogram:', Object.entries(histogram).map(([k, v]) => `${k}:${v}`).join(' '));
