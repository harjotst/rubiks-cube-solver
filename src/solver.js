/**
 * Two-phase IDA* solver.
 *
 * The original solver (solver/rubiks-cube-solver.cpp) ran a single IDA*
 * search from the scrambled cube to the solved cube, using the larger of
 * three pattern-database lookups as its heuristic. That is Korf's algorithm,
 * and it is optimal, but with the databases the original used (173 million
 * entries) it needs gigabytes of memory and can take hours on a hard cube.
 *
 * The port keeps the same machinery, IDA* driven by BFS-built pattern
 * databases, but runs it twice on smaller problems (Kociemba's two-phase
 * algorithm):
 *
 *   phase 1  bring the cube into the subgroup G1 = <U, D, R2, L2, F2, B2>:
 *            every corner and edge oriented, the four slice edges FR FL BL BR
 *            back in their slice. Heuristic: max(twist×slice, flip×slice).
 *   phase 2  solve the cube using only G1 moves, which can never disturb
 *            what phase 1 achieved. Heuristic: max(cornerPerm×slice,
 *            udEdgePerm×slice).
 *
 * Every phase-1 solution found is followed by a phase-2 search; the shortest
 * total wins. The search keeps looking for better combinations until the
 * solution is short enough (`maxLength`) or time runs out (`timeLimitMs`),
 * so the result is normally 19-22 moves rather than the 12 + 18 the two
 * phases could add up to.
 */

import { Cube, FACE_TURNS, applyPerm, findOrientation, relabelFaceTurns, ROTATION_PERMS, normalizeMove } from './cube.js';
import { CubieCube, CUBIE_MOVES, multiplyInto, turnFace, isPhase2Turn } from './cubies.js';
import { getTwist, getFlip, getSlice, getCornerPerm, getUDEdgePerm, getSliceSorted, N_SLICE, N_SLICE_SORTED } from './coords.js';
import { N_MOVES, PHASE2_MOVES, buildTables, TABLE_SIZES } from './tables.js';

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/**
 * ALLOWED[(prev + 1) * 18 + m] is 1 when turn `m` may follow turn `prev`
 * (prev = -1 for "no previous turn"). Two turns of the same face in a row
 * are never needed, and turns of opposite faces commute, so they are only
 * generated in one order (U before D, R before L, F before B).
 */
const ALLOWED = (() => {
  const t = new Uint8Array(19 * N_MOVES);
  for (let prev = -1; prev < N_MOVES; prev++) {
    for (let m = 0; m < N_MOVES; m++) {
      let ok = true;
      if (prev >= 0) {
        const pf = turnFace(prev);
        const f = turnFace(m);
        ok = pf !== f && pf - 3 !== f;
      }
      t[(prev + 1) * N_MOVES + m] = ok ? 1 : 0;
    }
  }
  return t;
})();

/**
 * Merge neighbouring turns of the same face ("R R2" → "R'", "R R'" → nothing),
 * also across one turn of the opposite face, which commutes ("L R2 L2" →
 * "L' R2"). Works on turn indices (face * 3 + power). Inside each phase the
 * search never generates such pairs; they can only appear where the two
 * phases meet.
 */
export function simplifyTurns(turns) {
  const out = [];
  for (const m of turns) {
    if (!Number.isInteger(m) || m < 0 || m >= N_MOVES) throw new Error(`Not a face turn index: ${m}`);
    const f = turnFace(m);
    let i = out.length - 1;
    if (i >= 1 && turnFace(out[i]) !== f && turnFace(out[i]) % 3 === f % 3 && turnFace(out[i - 1]) === f) i -= 1;
    if (i >= 0 && turnFace(out[i]) === f) {
      const total = ((out[i] % 3) + 1 + (m % 3) + 1) % 4;
      if (total === 0) out.splice(i, 1);
      else out[i] = f * 3 + total - 1;
    } else {
      out.push(m);
    }
  }
  return out;
}

/** Same as simplifyTurns, on move names (face turns only). */
export function simplifyMoves(moves) {
  const turns = moves.map((m) => {
    const idx = FACE_TURNS.indexOf(normalizeMove(m));
    if (idx < 0) throw new Error(`Not a face turn "${m}"`);
    return idx;
  });
  return simplifyTurns(turns).map((m) => FACE_TURNS[m]);
}

/**
 * Accept a Cube, a CubieCube, 54 stickers, or a scramble string. A sticker
 * cube that is held in a non-standard orientation (its centres moved by
 * x/y/z, wide or slice moves) is rotated back first; `relabel` then maps
 * each face turn of a solution for the rotated cube to the face turn that
 * does the same thing to the cube as it was given.
 */
export function prepareInput(input) {
  if (input instanceof CubieCube) return { cube: input.clone(), relabel: null };
  let stickers;
  if (input instanceof Cube) stickers = input.stickers;
  else if (typeof input === 'string') stickers = Cube.fromMoves(input).stickers;
  else if (input && input.length === 54) stickers = Uint8Array.from(input);
  else throw new Error('Expected a Cube, a CubieCube, 54 stickers or a move sequence.');
  let relabel = null;
  const home = ROTATION_PERMS[0];
  const rotation = findOrientation(stickers);
  if (rotation === null) throw new Error('The six centre stickers must be one of each colour.');
  if (rotation !== home) {
    stickers = applyPerm(stickers, rotation);
    relabel = relabelFaceTurns(rotation);
  }
  return { cube: CubieCube.fromStickers(stickers), relabel };
}

/** The cubie state of any accepted input, in standard orientation. */
export function toCubieCube(input) {
  return prepareInput(input).cube;
}

/** Why `input` cannot be a real cube, or null when it can be solved. */
export function checkCube(input) {
  try {
    return prepareInput(input).cube.verify();
  } catch (err) {
    return err.message;
  }
}

const MAX_PHASE1_DEPTH = 12; // no cube needs more to reach G1
const MAX_PHASE2_DEPTH = 18; // no G1 cube needs more to be solved

export class Solver {
  /** @param {ReturnType<typeof buildTables>} [tables] prebuilt tables; built on demand otherwise */
  constructor(tables) {
    this.tables = tables || buildTables();
    for (const [name, size] of Object.entries(TABLE_SIZES)) {
      const t = this.tables[name];
      if (!t || t.length !== size) throw new Error(`tables must come from buildTables(): ${name} is missing or has the wrong size`);
    }
  }

  /**
   * Solve a cube.
   *
   * @param input      Cube | CubieCube | 54 stickers | scramble string
   * @param options.maxLength    stop as soon as a solution this short is found (default 22)
   * @param options.timeLimitMs  give up improving after this long (default 2000);
   *                             at least one solution is always returned
   * @param options.shortDepth  cubes this close to solved are solved optimally first (default 5;
   *                             this quick search is not subject to the time limit)
   * @returns {{ moves: string[], length: number, phase1Length: number, phase2Length: number,
   *             optimal: boolean, nodes: number, elapsedMs: number, timedOut: boolean }}
   *          `moves` solve the cube exactly as it was given, even if it was
   *          held in a non-standard orientation.
   */
  solve(input, options = {}) {
    const { maxLength = 22, timeLimitMs = 2000, shortDepth = 5 } = options;
    if (!(shortDepth >= 0 && shortDepth <= 8)) throw new Error('shortDepth must be between 0 and 8.');
    if (!(timeLimitMs >= 0)) throw new Error('timeLimitMs must be a non-negative number.');
    if (!(maxLength >= 0)) throw new Error('maxLength must be a non-negative number.');
    const { cube: cc, relabel } = prepareInput(input);
    const problem = cc.verify();
    if (problem) throw new Error(problem);

    const {
      twistMove, flipMove, sliceMove, cornerPermMove, udEdgePermMove, sliceSortedMove,
      prunTwistSlice, prunFlipSlice, prunCornerSlice, prunEdgeSlice,
    } = this.tables;

    const start = now();
    const deadline = start + timeLimitMs;
    const path1 = new Int8Array(32);
    const path2 = new Int8Array(32);
    let nodes = 0;
    let best = null;
    let bestPhase1 = 0;
    let stop = false;
    let timedOut = false;
    let optimal = false;

    const twist0 = getTwist(cc);
    const flip0 = getFlip(cc);
    const slice0 = getSlice(cc);

    // ---- cubes only a few moves from solved: plain optimal IDA* -------------
    // The phase-1 tables are admissible for the whole cube (they ignore
    // pieces, never moves), so this is Korf's algorithm with two of his
    // pattern databases, run just deep enough to be instant.
    const levels = [];
    for (let i = 0; i <= shortDepth; i++) levels.push(i === 0 ? cc.clone() : CubieCube.solved());
    const shortSearch = (twist, flip, slice, g, depth, prev) => {
      const h = Math.max(prunTwistSlice[twist * N_SLICE + slice], prunFlipSlice[flip * N_SLICE + slice]);
      const remaining = depth - g;
      if (h > remaining) return false;
      if (remaining === 0) return levels[g].isSolved();
      nodes++;
      const row = (prev + 1) * N_MOVES;
      for (let m = 0; m < N_MOVES; m++) {
        if (ALLOWED[row + m] === 0) continue;
        path1[g] = m;
        multiplyInto(levels[g + 1], levels[g], CUBIE_MOVES[m]);
        if (shortSearch(twistMove[twist * N_MOVES + m], flipMove[flip * N_MOVES + m], sliceMove[slice * N_MOVES + m], g + 1, depth, m)) return true;
      }
      return false;
    };
    for (let depth = 0; depth <= shortDepth && best === null; depth++) {
      if (shortSearch(twist0, flip0, slice0, 0, depth, -1)) {
        best = Array.from(path1.subarray(0, depth));
        bestPhase1 = depth;
        optimal = true;
      }
    }

    const checkTime = () => {
      if (best !== null && now() > deadline) {
        timedOut = true;
        stop = true;
      }
    };

    // ---- phase 2 -----------------------------------------------------------

    const phase2 = (cp, ep, ss, g, depth, prev) => {
      const h = Math.max(prunCornerSlice[cp * N_SLICE_SORTED + ss], prunEdgeSlice[ep * N_SLICE_SORTED + ss]);
      const remaining = depth - g;
      if (h > remaining) return false;
      if (remaining === 0) return true; // h === 0 here, so every phase-2 coordinate is home
      if ((++nodes & 0x3fff) === 0) checkTime();
      const row = (prev + 1) * N_MOVES;
      for (let k = 0; k < PHASE2_MOVES.length; k++) {
        const m = PHASE2_MOVES[k];
        if (ALLOWED[row + m] === 0) continue;
        path2[g] = m;
        if (phase2(cornerPermMove[cp * N_MOVES + m], udEdgePermMove[ep * N_MOVES + m], sliceSortedMove[ss * N_MOVES + m], g + 1, depth, m)) return true;
        if (stop) return false;
      }
      return false;
    };

    const searchPhase2 = (cube1, maxDepth2) => {
      const cp = getCornerPerm(cube1);
      const ep = getUDEdgePerm(cube1);
      const ss = getSliceSorted(cube1);
      const h0 = Math.max(prunCornerSlice[cp * N_SLICE_SORTED + ss], prunEdgeSlice[ep * N_SLICE_SORTED + ss]);
      for (let d = h0; d <= maxDepth2; d++) {
        if (phase2(cp, ep, ss, 0, d, -1)) return d;
        if (stop) return -1;
      }
      return -1;
    };

    const onPhase1Solution = (depth1) => {
      const prev = depth1 > 0 ? path1[depth1 - 1] : -1;
      // A phase-1 solution ending in a G1 move was already in G1 one move
      // earlier, so that shorter prefix (searched at the previous depth)
      // cannot lead to a longer total.
      if (prev >= 0 && isPhase2Turn(prev)) return;
      const cube1 = cc.clone();
      for (let i = 0; i < depth1; i++) cube1.multiply(CUBIE_MOVES[path1[i]]);
      // Until something is found, allow the longest phase 2 there is; after
      // that only strictly shorter totals are worth searching for.
      const limit = best === null ? MAX_PHASE2_DEPTH : best.length - 1 - depth1;
      if (limit < 0) return;
      const depth2 = searchPhase2(cube1, limit);
      if (depth2 < 0) return;
      // Phase 2 may open with the face phase 1 closed on ("R" then "R2");
      // merging those is exactly the shorter solution a sibling phase-1
      // path would have produced.
      const candidate = simplifyTurns(Array.from(path1.subarray(0, depth1)).concat(Array.from(path2.subarray(0, depth2))));
      if (best !== null && candidate.length >= best.length) return;
      best = candidate;
      bestPhase1 = depth1; // a merge only ever shortens the phase-2 part

      if (best.length <= maxLength) stop = true;
    };

    // ---- phase 1 -----------------------------------------------------------

    const phase1 = (twist, flip, slice, g, depth, prev) => {
      const h = Math.max(prunTwistSlice[twist * N_SLICE + slice], prunFlipSlice[flip * N_SLICE + slice]);
      const remaining = depth - g;
      if (h > remaining) return;
      if (remaining === 0) {
        onPhase1Solution(depth);
        return;
      }
      // Already in G1: the only way back into G1 within four more moves is
      // with G1 turns only, and those solutions were reported at a shorter
      // depth (onPhase1Solution drops them anyway). The shortest sequence
      // that leaves G1 and returns has five moves (e.g. R L U2 R L), so this
      // threshold must stay at 4 or below.
      if (h === 0 && remaining <= 4) return;
      if ((++nodes & 0x3fff) === 0) checkTime();
      const row = (prev + 1) * N_MOVES;
      for (let m = 0; m < N_MOVES; m++) {
        if (ALLOWED[row + m] === 0) continue;
        path1[g] = m;
        phase1(twistMove[twist * N_MOVES + m], flipMove[flip * N_MOVES + m], sliceMove[slice * N_MOVES + m], g + 1, depth, m);
        if (stop) return;
      }
    };

    if (!optimal) {
      // Every cube reaches G1 within 12 moves and every G1 cube is solved
      // within 18, so this loop always finds something for a valid cube.
      for (let depth = 0; depth <= MAX_PHASE1_DEPTH && !stop; depth++) {
        phase1(twist0, flip0, slice0, 0, depth, -1);
      }
    }
    if (best === null) throw new Error('No solution found.');

    return {
      moves: best.map((m) => (relabel ? relabel[FACE_TURNS[m]] : FACE_TURNS[m])),
      length: best.length,
      phase1Length: bestPhase1,
      phase2Length: best.length - bestPhase1,
      optimal,
      nodes,
      elapsedMs: now() - start,
      timedOut,
    };
  }
}
