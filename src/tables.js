/**
 * Move tables and pruning tables (pattern databases).
 *
 * The original generated its pattern databases with a breadth-first search
 * from the solved cube (corners_pdb_generator.py, edges_pdb_generator.py):
 * pop a state, apply every move, record the depth of anything not seen
 * before. The same loop is used here, on coordinates instead of cubes, so
 * that the databases can be rebuilt in about a second every time the page
 * loads rather than shipped as multi-gigabyte text files.
 *
 *   phase 1: twist×slice (1,082,565 entries) and flip×slice (1,013,760)
 *   phase 2: cornerPerm×sliceSorted (967,680) and udEdgePerm×sliceSorted (967,680)
 *
 * A pruning value is the exact number of moves needed to solve that part of
 * the cube on its own, which is a lower bound on the moves needed to solve
 * the whole cube: the admissible heuristic IDA* needs.
 */

import { CubieCube, CUBIE_MOVES } from './cubies.js';
import {
  N_TWIST, N_FLIP, N_SLICE, N_PERM, N_SLICE_SORTED,
  getTwist, setTwist, getFlip, setFlip, getSlice, setSlice,
  getCornerPerm, setCornerPerm, getUDEdgePerm, setUDEdgePerm, getSliceSorted, setSliceSorted,
} from './coords.js';

export const N_MOVES = 18;

/** Indices into FACE_TURNS of U U2 U' R2 F2 D D2 D' L2 B2. */
export const PHASE2_MOVES = Object.freeze([0, 1, 2, 4, 7, 9, 10, 11, 13, 16]);
const ALL_MOVES = Object.freeze([...Array(18).keys()]);

const UNSET = 0xffff;

function buildMoveTable(size, get, set, part, moves) {
  const table = new Uint16Array(size * N_MOVES).fill(UNSET);
  const cc = CubieCube.solved();
  const scratch = CubieCube.solved();
  const moveList = Uint8Array.from(moves);
  for (let i = 0; i < size; i++) {
    set(cc, i);
    const base = i * N_MOVES;
    for (let k = 0; k < moveList.length; k++) {
      const m = moveList[k];
      const mv = CUBIE_MOVES[m];
      // Multiply into `scratch` without allocating: this loop runs ~1.5M times.
      if (part === 'corner') {
        for (let j = 0; j < 8; j++) {
          scratch.cp[j] = cc.cp[mv.cp[j]];
          scratch.co[j] = (cc.co[mv.cp[j]] + mv.co[j]) % 3;
        }
      } else {
        for (let j = 0; j < 12; j++) {
          scratch.ep[j] = cc.ep[mv.ep[j]];
          scratch.eo[j] = (cc.eo[mv.ep[j]] + mv.eo[j]) & 1;
        }
      }
      table[base + m] = get(scratch);
    }
  }
  return table;
}

/**
 * Breadth-first search over the product of two coordinates. Every state is
 * visited exactly once, so the cost is (states × moves) table lookups.
 */
function buildPruningTable(n1, n2, moveTable1, moveTable2, moves) {
  const size = n1 * n2;
  const prun = new Uint8Array(size).fill(255);
  const queue = new Uint32Array(size);
  const moveList = Uint8Array.from(moves);
  const moveCount = moveList.length;
  prun[0] = 0;
  queue[0] = 0;
  let head = 0;
  let tail = 1;
  let maxDepth = 0;
  while (head < tail) {
    const idx = queue[head++];
    const a = (idx / n2) | 0;
    const b = idx - a * n2;
    const depth = prun[idx] + 1;
    const rowA = a * N_MOVES;
    const rowB = b * N_MOVES;
    for (let k = 0; k < moveCount; k++) {
      const m = moveList[k];
      const next = moveTable1[rowA + m] * n2 + moveTable2[rowB + m];
      if (prun[next] === 255) {
        prun[next] = depth;
        queue[tail++] = next;
        if (depth > maxDepth) maxDepth = depth;
      }
    }
  }
  if (tail !== size) throw new Error(`Pruning table only reached ${tail} of ${size} states`);
  return { table: prun, maxDepth };
}

/**
 * Build every table the solver needs. `onProgress(stage, done, total)` is
 * called between steps so a UI can show what is happening. Everything in
 * the result is plain data (typed arrays and numbers), so it can be posted
 * between a worker and the page unchanged.
 */
export function buildTables(onProgress = () => {}) {
  const steps = 10;
  let step = 0;
  const report = (stage) => onProgress(stage, step++, steps);

  report('corner orientation moves');
  const twistMove = buildMoveTable(N_TWIST, getTwist, setTwist, 'corner', ALL_MOVES);
  report('edge orientation moves');
  const flipMove = buildMoveTable(N_FLIP, getFlip, setFlip, 'edge', ALL_MOVES);
  report('slice position moves');
  const sliceMove = buildMoveTable(N_SLICE, getSlice, setSlice, 'edge', ALL_MOVES);
  report('corner permutation moves');
  const cornerPermMove = buildMoveTable(N_PERM, getCornerPerm, setCornerPerm, 'corner', ALL_MOVES);
  report('edge permutation moves');
  const udEdgePermMove = buildMoveTable(N_PERM, getUDEdgePerm, setUDEdgePerm, 'edge', PHASE2_MOVES);
  report('slice permutation moves');
  const sliceSortedMove = buildMoveTable(N_SLICE_SORTED, getSliceSorted, setSliceSorted, 'edge', PHASE2_MOVES);

  report('corner orientation × slice distances');
  const twistSlice = buildPruningTable(N_TWIST, N_SLICE, twistMove, sliceMove, ALL_MOVES);
  report('edge orientation × slice distances');
  const flipSlice = buildPruningTable(N_FLIP, N_SLICE, flipMove, sliceMove, ALL_MOVES);
  report('corner permutation × slice distances');
  const cornerSlice = buildPruningTable(N_PERM, N_SLICE_SORTED, cornerPermMove, sliceSortedMove, PHASE2_MOVES);
  report('edge permutation × slice distances');
  const edgeSlice = buildPruningTable(N_PERM, N_SLICE_SORTED, udEdgePermMove, sliceSortedMove, PHASE2_MOVES);
  onProgress('ready', steps, steps);

  return {
    twistMove, flipMove, sliceMove, cornerPermMove, udEdgePermMove, sliceSortedMove,
    prunTwistSlice: twistSlice.table,
    prunFlipSlice: flipSlice.table,
    prunCornerSlice: cornerSlice.table,
    prunEdgeSlice: edgeSlice.table,
    /** Deepest entry of each pattern database (plain data, survives structured cloning). */
    depths: {
      twistSlice: twistSlice.maxDepth,
      flipSlice: flipSlice.maxDepth,
      cornerSlice: cornerSlice.maxDepth,
      edgeSlice: edgeSlice.maxDepth,
    },
  };
}

/** Names and sizes of the arrays buildTables() returns, for validation. */
export const TABLE_SIZES = Object.freeze({
  twistMove: N_TWIST * N_MOVES,
  flipMove: N_FLIP * N_MOVES,
  sliceMove: N_SLICE * N_MOVES,
  cornerPermMove: N_PERM * N_MOVES,
  udEdgePermMove: N_PERM * N_MOVES,
  sliceSortedMove: N_SLICE_SORTED * N_MOVES,
  prunTwistSlice: N_TWIST * N_SLICE,
  prunFlipSlice: N_FLIP * N_SLICE,
  prunCornerSlice: N_PERM * N_SLICE_SORTED,
  prunEdgeSlice: N_PERM * N_SLICE_SORTED,
});
