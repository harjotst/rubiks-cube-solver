/**
 * Scrambles and random cube states.
 */

import { FACE_TURNS } from './cube.js';
import { CubieCube, turnFace } from './cubies.js';

/** Small seedable PRNG so tests are reproducible. Returns () => [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

/** A uniformly random solvable cube state. */
export function randomState(rng = Math.random) {
  const cc = new CubieCube();
  shuffle(cc.cp, rng);
  shuffle(cc.ep, rng);
  if (cc.cornerParity() !== cc.edgeParity()) {
    const t = cc.ep[0];
    cc.ep[0] = cc.ep[1];
    cc.ep[1] = t;
  }
  let twist = 0;
  for (let i = 0; i < 7; i++) {
    cc.co[i] = Math.floor(rng() * 3);
    twist += cc.co[i];
  }
  cc.co[7] = (3 - (twist % 3)) % 3;
  let flip = 0;
  for (let i = 0; i < 11; i++) {
    cc.eo[i] = Math.floor(rng() * 2);
    flip += cc.eo[i];
  }
  cc.eo[11] = flip & 1;
  return cc;
}

/**
 * A random sequence of face turns with no wasted moves: never the same face
 * twice in a row, and never three turns on the same axis in a row.
 */
export function randomMoves(count = 25, rng = Math.random) {
  const moves = [];
  let prevFace = -1;
  let prevPrevFace = -1;
  while (moves.length < count) {
    const m = Math.floor(rng() * 18);
    const f = turnFace(m);
    if (f === prevFace) continue;
    if (prevFace >= 0 && f % 3 === prevFace % 3 && prevPrevFace === f) continue;
    moves.push(FACE_TURNS[m]);
    prevPrevFace = prevFace;
    prevFace = f;
  }
  return moves;
}
