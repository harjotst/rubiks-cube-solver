/**
 * Coordinates: compact integers that describe one aspect of a cubie state.
 *
 * The original solver packed a whole state into three 40/48-bit "pattern
 * keys" (RubiksCubePatternKey) and looked those keys up in pattern databases.
 * A pattern key that has to identify every piece is too large to tabulate, so
 * the port splits the state into the six standard coordinates of the
 * two-phase algorithm. Each is small enough that a table indexed by it fits
 * comfortably in memory, and each can be moved with a table lookup instead of
 * by re-simulating the cube.
 *
 *   phase 1                          phase 2 (only meaningful inside G1)
 *   twist   corner orientation 3^7   cornerPerm    corner permutation 8!
 *   flip    edge orientation   2^11  udEdgePerm    permutation of the 8 U/D edges 8!
 *   slice   where the 4 slice edges  sliceSorted   permutation of the 4 slice edges 4!
 *           are, C(12,4) = 495
 */

export const N_TWIST = 2187;
export const N_FLIP = 2048;
export const N_SLICE = 495;
export const N_PERM = 40320;
export const N_SLICE_SORTED = 24;

/** Binomial coefficients up to 12, with C(n, k) = 0 when k > n. */
const BINOMIAL = (() => {
  const c = [];
  for (let n = 0; n <= 12; n++) {
    c.push(new Array(13).fill(0));
    c[n][0] = 1;
    for (let k = 1; k <= n; k++) c[n][k] = c[n - 1][k - 1] + (k <= n - 1 ? c[n - 1][k] : 0);
  }
  return c;
})();

export function binomial(n, k) {
  return k < 0 || k > n ? 0 : BINOMIAL[n][k];
}

const FACTORIAL = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800, 479001600];

/** Lehmer code of the first `n` entries of a permutation of 0..n-1 (identity → 0). */
export function permToIndex(perm, n = perm.length) {
  let idx = 0;
  for (let i = 0; i < n - 1; i++) {
    let smallerAfter = 0;
    for (let j = i + 1; j < n; j++) if (perm[j] < perm[i]) smallerAfter++;
    idx = idx * (n - i) + smallerAfter;
  }
  return idx;
}

/** Inverse of permToIndex. */
export function indexToPerm(idx, n) {
  const available = [];
  for (let i = 0; i < n; i++) available.push(i);
  const perm = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const f = FACTORIAL[n - 1 - i];
    const k = (idx / f) | 0;
    idx -= k * f;
    perm[i] = available.splice(k, 1)[0];
  }
  return perm;
}

// ---- phase 1 ---------------------------------------------------------------

export function getTwist(cc) {
  let t = 0;
  for (let i = 0; i < 7; i++) t = 3 * t + cc.co[i];
  return t;
}

export function setTwist(cc, twist) {
  let sum = 0;
  for (let i = 6; i >= 0; i--) {
    cc.co[i] = twist % 3;
    sum += cc.co[i];
    twist = (twist / 3) | 0;
  }
  cc.co[7] = (3 - (sum % 3)) % 3;
}

export function getFlip(cc) {
  let f = 0;
  for (let i = 0; i < 11; i++) f = 2 * f + cc.eo[i];
  return f;
}

export function setFlip(cc, flip) {
  let sum = 0;
  for (let i = 10; i >= 0; i--) {
    cc.eo[i] = flip & 1;
    sum += cc.eo[i];
    flip >>= 1;
  }
  cc.eo[11] = sum & 1;
}

/** Which four positions hold the slice edges FR, FL, BL, BR (0 = home). */
export function getSlice(cc) {
  let a = 0;
  let x = 0;
  for (let j = 11; j >= 0; j--) {
    if (cc.ep[j] >= 8) {
      a += binomial(11 - j, x + 1);
      x++;
    }
  }
  return a;
}

/** Place the slice edges (in order) at the positions coded by `slice`; other edges fill up in order. */
export function setSlice(cc, slice) {
  const ep = cc.ep;
  ep.fill(255);
  let x = 3;
  for (let j = 0; j < 12; j++) {
    const c = binomial(11 - j, x + 1);
    if (slice - c >= 0) {
      ep[j] = 8 + (3 - x);
      slice -= c;
      x--;
    }
  }
  let next = 0;
  for (let j = 0; j < 12; j++) if (ep[j] === 255) ep[j] = next++;
}

// ---- phase 2 ---------------------------------------------------------------

export function getCornerPerm(cc) {
  return permToIndex(cc.cp);
}

export function setCornerPerm(cc, idx) {
  cc.cp.set(indexToPerm(idx, 8));
}

/** Permutation of the eight U/D edges, which in G1 occupy positions 0..7. */
export function getUDEdgePerm(cc) {
  return permToIndex(cc.ep, 8);
}

export function setUDEdgePerm(cc, idx) {
  cc.ep.set(indexToPerm(idx, 8), 0);
  for (let i = 8; i < 12; i++) cc.ep[i] = i;
}

/** Permutation of the four slice edges within positions 8..11. */
export function getSliceSorted(cc) {
  const p = [cc.ep[8] - 8, cc.ep[9] - 8, cc.ep[10] - 8, cc.ep[11] - 8];
  return permToIndex(p, 4);
}

export function setSliceSorted(cc, idx) {
  const p = indexToPerm(idx, 4);
  for (let i = 0; i < 4; i++) cc.ep[8 + i] = 8 + p[i];
  for (let i = 0; i < 8; i++) cc.ep[i] = i;
}
