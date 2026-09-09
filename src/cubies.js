/**
 * Cubie-level model: where each of the 8 corner and 12 edge pieces sits and
 * how it is twisted or flipped.
 *
 * The original solver read pieces straight off the stickers: it identified a
 * corner by multiplying its three colours (`corner-face-product-to-type.json`)
 * and found its orientation by looking the colour triple up in a table of the
 * three cyclic rotations (`corner-orientations-for-corner-type-and-position`).
 * That is exactly what this module does, with two changes:
 *
 *   - the lookup tables are computed from the facelet map instead of loaded
 *     from JSON, and the "product" trick is replaced by an ordinary colour
 *     comparison;
 *   - orientation is measured the standard way (where the U/D sticker of a
 *     corner sits, where the U/D or F/B sticker of an edge sits) so that the
 *     two-phase search can rely on the moves U, D, R2, L2, F2 and B2 leaving
 *     every orientation unchanged.
 *
 * Piece numbering follows Kociemba's convention:
 *   corners: URF UFL ULB UBR DFR DLF DBL DRB
 *   edges:   UR UF UL UB DR DF DL DB FR FL BL BR
 * The four edges FR, FL, BL, BR form the "UD slice".
 */

import { U, D, R, L, F, B, stickerIndex, solvedStickers, applyPerm, MOVE_PERMS, FACE_TURNS, FACE_LETTERS, COLOR_NAMES, normalizeMove, parseMoves } from './cube.js';

export const CORNERS = Object.freeze(['URF', 'UFL', 'ULB', 'UBR', 'DFR', 'DLF', 'DBL', 'DRB']);
export const EDGES = Object.freeze(['UR', 'UF', 'UL', 'UB', 'DR', 'DF', 'DL', 'DB', 'FR', 'FL', 'BL', 'BR']);

const S = stickerIndex;

/**
 * The three stickers of every corner position: the U/D sticker first, then
 * the other two clockwise as seen from outside the cube.
 */
export const CORNER_FACELETS = Object.freeze([
  [S(U, 2, 2), S(R, 0, 0), S(F, 0, 2)], // URF
  [S(U, 2, 0), S(F, 0, 0), S(L, 0, 2)], // UFL
  [S(U, 0, 0), S(L, 0, 0), S(B, 0, 2)], // ULB
  [S(U, 0, 2), S(B, 0, 0), S(R, 0, 2)], // UBR
  [S(D, 0, 2), S(F, 2, 2), S(R, 2, 0)], // DFR
  [S(D, 0, 0), S(L, 2, 2), S(F, 2, 0)], // DLF
  [S(D, 2, 0), S(B, 2, 2), S(L, 2, 0)], // DBL
  [S(D, 2, 2), S(R, 2, 2), S(B, 2, 0)], // DRB
].map(Object.freeze));

/**
 * The two stickers of every edge position: the U/D sticker first for the
 * eight U/D-layer edges, the F/B sticker first for the four slice edges.
 */
export const EDGE_FACELETS = Object.freeze([
  [S(U, 1, 2), S(R, 0, 1)], // UR
  [S(U, 2, 1), S(F, 0, 1)], // UF
  [S(U, 1, 0), S(L, 0, 1)], // UL
  [S(U, 0, 1), S(B, 0, 1)], // UB
  [S(D, 1, 2), S(R, 2, 1)], // DR
  [S(D, 0, 1), S(F, 2, 1)], // DF
  [S(D, 1, 0), S(L, 2, 1)], // DL
  [S(D, 2, 1), S(B, 2, 1)], // DB
  [S(F, 1, 2), S(R, 1, 0)], // FR
  [S(F, 1, 0), S(L, 1, 2)], // FL
  [S(B, 1, 2), S(L, 1, 0)], // BL
  [S(B, 1, 0), S(R, 1, 2)], // BR
].map(Object.freeze));

/** Colours of each piece on a solved cube, in the facelet order above. */
export const CORNER_COLORS = Object.freeze(CORNER_FACELETS.map((f) => Object.freeze(f.map((i) => (i / 9) | 0))));
export const EDGE_COLORS = Object.freeze(EDGE_FACELETS.map((f) => Object.freeze(f.map((i) => (i / 9) | 0))));

export class CubieCube {
  constructor(cp, co, ep, eo) {
    /** corner permutation: cp[i] is the corner piece sitting at position i */
    this.cp = cp ? Uint8Array.from(cp) : Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7]);
    /** corner orientation 0..2: how far the U/D sticker is twisted from its U/D facelet */
    this.co = co ? Uint8Array.from(co) : new Uint8Array(8);
    /** edge permutation: ep[i] is the edge piece sitting at position i */
    this.ep = ep ? Uint8Array.from(ep) : Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    /** edge orientation 0..1 */
    this.eo = eo ? Uint8Array.from(eo) : new Uint8Array(12);
  }

  static solved() {
    return new CubieCube();
  }

  clone() {
    return new CubieCube(this.cp, this.co, this.ep, this.eo);
  }

  equals(o) {
    if (!(o instanceof CubieCube)) return false;
    for (let i = 0; i < 8; i++) if (this.cp[i] !== o.cp[i] || this.co[i] !== o.co[i]) return false;
    for (let i = 0; i < 12; i++) if (this.ep[i] !== o.ep[i] || this.eo[i] !== o.eo[i]) return false;
    return true;
  }

  isSolved() {
    return this.equals(SOLVED);
  }

  /** this = this * b, corners only. `b` is usually a move. */
  cornerMultiply(b) {
    const cp = new Uint8Array(8);
    const co = new Uint8Array(8);
    for (let i = 0; i < 8; i++) {
      cp[i] = this.cp[b.cp[i]];
      co[i] = (this.co[b.cp[i]] + b.co[i]) % 3;
    }
    this.cp = cp;
    this.co = co;
    return this;
  }

  /** this = this * b, edges only. */
  edgeMultiply(b) {
    const ep = new Uint8Array(12);
    const eo = new Uint8Array(12);
    for (let i = 0; i < 12; i++) {
      ep[i] = this.ep[b.ep[i]];
      eo[i] = (this.eo[b.ep[i]] + b.eo[i]) & 1;
    }
    this.ep = ep;
    this.eo = eo;
    return this;
  }

  /** this = this * b: the state after applying `b` to this state. */
  multiply(b) {
    return this.cornerMultiply(b).edgeMultiply(b);
  }

  /** The state that undoes this one. */
  inverse() {
    const inv = new CubieCube();
    for (let i = 0; i < 8; i++) inv.cp[this.cp[i]] = i;
    for (let i = 0; i < 8; i++) inv.co[i] = (3 - this.co[inv.cp[i]]) % 3;
    for (let i = 0; i < 12; i++) inv.ep[this.ep[i]] = i;
    for (let i = 0; i < 12; i++) inv.eo[i] = this.eo[inv.ep[i]];
    return inv;
  }

  /**
   * Apply one of the 18 face turns, by index (see FACE_TURNS) or by name in
   * any spelling normalizeMove accepts. The cubie model has no centres, so
   * rotations, slice and wide moves are not available here.
   */
  move(m) {
    let idx = -1;
    if (typeof m === 'number') idx = Number.isInteger(m) ? m : -1;
    else idx = FACE_TURNS.indexOf(normalizeMove(m));
    if (idx < 0 || idx >= 18) throw new Error(`Unknown face turn "${m}": the cubie model only supports U D R L F B turns`);
    return this.multiply(CUBIE_MOVES[idx]);
  }

  /** Apply a sequence of face turns (a string, or an array of names/indices). */
  applyMoves(moves) {
    const list = typeof moves === 'string' ? parseMoves(moves) : moves;
    if (!Array.isArray(list) && !ArrayBuffer.isView(list)) throw new TypeError('applyMoves expects a string or an array of moves');
    for (const m of list) this.move(m);
    return this;
  }

  cornerParity() {
    let p = 0;
    for (let i = 7; i > 0; i--) for (let j = i - 1; j >= 0; j--) if (this.cp[j] > this.cp[i]) p ^= 1;
    return p;
  }

  edgeParity() {
    let p = 0;
    for (let i = 11; i > 0; i--) for (let j = i - 1; j >= 0; j--) if (this.ep[j] > this.ep[i]) p ^= 1;
    return p;
  }

  /**
   * Explain why this state cannot exist on a real cube, or return null if it
   * can. Mirrors the checks in Kociemba's `verify()`.
   */
  verify() {
    for (let i = 0; i < 8; i++) if (this.co[i] > 2) return 'Invalid corner orientation.';
    for (let i = 0; i < 12; i++) if (this.eo[i] > 1) return 'Invalid edge orientation.';
    const seenE = new Uint8Array(12);
    for (let i = 0; i < 12; i++) {
      if (this.ep[i] > 11) return 'Invalid edge piece.';
      seenE[this.ep[i]]++;
    }
    for (let i = 0; i < 12; i++) if (seenE[i] > 1) return `The ${EDGES[i]} edge appears ${seenE[i]} times; every edge must appear exactly once.`;
    for (let i = 0; i < 12; i++) if (seenE[i] === 0) return `The ${EDGES[i]} edge is missing; every edge must appear exactly once.`;
    const seenC = new Uint8Array(8);
    for (let i = 0; i < 8; i++) {
      if (this.cp[i] > 7) return 'Invalid corner piece.';
      seenC[this.cp[i]]++;
    }
    for (let i = 0; i < 8; i++) if (seenC[i] > 1) return `The ${CORNERS[i]} corner appears ${seenC[i]} times; every corner must appear exactly once.`;
    for (let i = 0; i < 8; i++) if (seenC[i] === 0) return `The ${CORNERS[i]} corner is missing; every corner must appear exactly once.`;
    let flip = 0;
    for (let i = 0; i < 12; i++) flip += this.eo[i];
    if (flip % 2 !== 0) return 'One edge is flipped: the total edge flip must be even.';
    let twist = 0;
    for (let i = 0; i < 8; i++) twist += this.co[i];
    if (twist % 3 !== 0) return 'One corner is twisted: the total corner twist must be a multiple of three.';
    if (this.cornerParity() !== this.edgeParity()) return 'Two pieces are swapped: corner and edge permutation parity must match.';
    return null;
  }

  /** Paint the 54 stickers this state produces. */
  toStickers() {
    const st = new Uint8Array(54);
    for (let f = 0; f < 6; f++) st[f * 9 + 4] = f;
    for (let i = 0; i < 8; i++) {
      const piece = this.cp[i];
      const ori = this.co[i];
      for (let k = 0; k < 3; k++) st[CORNER_FACELETS[i][(k + ori) % 3]] = CORNER_COLORS[piece][k];
    }
    for (let i = 0; i < 12; i++) {
      const piece = this.ep[i];
      const ori = this.eo[i];
      for (let k = 0; k < 2; k++) st[EDGE_FACELETS[i][(k + ori) % 2]] = EDGE_COLORS[piece][k];
    }
    return st;
  }

  /**
   * Read a cubie state off 54 stickers. Throws with a human-readable message
   * when the stickers do not describe real pieces; call `verify()` afterwards
   * for the parity checks.
   */
  static fromStickers(stickers) {
    const st = stickers;
    if (!st || st.length !== 54) throw new Error('Expected 54 stickers.');
    const counts = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 54; i++) {
      const c = st[i];
      if (!(c >= 0 && c < 6)) throw new Error(`Sticker ${i} has an invalid colour.`);
      counts[c]++;
    }
    for (let c = 0; c < 6; c++) {
      if (counts[c] !== 9) throw new Error(`There are ${counts[c]} ${COLOR_NAMES[c]} stickers; a cube has exactly nine of each colour.`);
    }
    for (let f = 0; f < 6; f++) {
      if (st[f * 9 + 4] !== f) throw new Error(`The centre of the ${FACE_LETTERS[f]} face must be ${COLOR_NAMES[f]}.`);
    }
    const cube = new CubieCube();
    for (let i = 0; i < 8; i++) {
      let ori = 0;
      for (; ori < 3; ori++) {
        const c = st[CORNER_FACELETS[i][ori]];
        if (c === U || c === D) break;
      }
      if (ori === 3) throw new Error(`The ${CORNERS[i]} corner has no yellow or white sticker.`);
      const c1 = st[CORNER_FACELETS[i][(ori + 1) % 3]];
      const c2 = st[CORNER_FACELETS[i][(ori + 2) % 3]];
      const c0 = st[CORNER_FACELETS[i][ori]];
      let piece = -1;
      for (let j = 0; j < 8; j++) {
        // All three colours must match: matching only the two side colours
        // would accept the mirror image of a corner, which no cube has.
        if (CORNER_COLORS[j][0] === c0 && CORNER_COLORS[j][1] === c1 && CORNER_COLORS[j][2] === c2) { piece = j; break; }
      }
      if (piece < 0) throw new Error(`The ${CORNERS[i]} corner (${describeColours(CORNER_FACELETS[i].map((k) => st[k]))}) is not a real corner piece.`);
      cube.cp[i] = piece;
      cube.co[i] = ori;
    }
    for (let i = 0; i < 12; i++) {
      const a = st[EDGE_FACELETS[i][0]];
      const b = st[EDGE_FACELETS[i][1]];
      let piece = -1;
      let ori = 0;
      for (let j = 0; j < 12; j++) {
        if (EDGE_COLORS[j][0] === a && EDGE_COLORS[j][1] === b) { piece = j; ori = 0; break; }
        if (EDGE_COLORS[j][0] === b && EDGE_COLORS[j][1] === a) { piece = j; ori = 1; break; }
      }
      if (piece < 0) throw new Error(`The ${EDGES[i]} edge (${describeColours([a, b])}) is not a real edge piece.`);
      cube.ep[i] = piece;
      cube.eo[i] = ori;
    }
    return cube;
  }
}

/** dst = a * b, reusing dst's arrays. dst must not alias a or b. */
export function multiplyInto(dst, a, b) {
  for (let i = 0; i < 8; i++) {
    dst.cp[i] = a.cp[b.cp[i]];
    dst.co[i] = (a.co[b.cp[i]] + b.co[i]) % 3;
  }
  for (let i = 0; i < 12; i++) {
    dst.ep[i] = a.ep[b.ep[i]];
    dst.eo[i] = (a.eo[b.ep[i]] + b.eo[i]) & 1;
  }
  return dst;
}

function describeColours(colours) {
  return colours.map((c) => COLOR_NAMES[c]).join('/');
}

const SOLVED = new CubieCube();

/**
 * The 18 face turns as cubie states, derived from the sticker model rather
 * than typed in, so the two representations can never disagree.
 */
export const CUBIE_MOVES = Object.freeze((() => {
  const moves = [];
  for (let f = 0; f < 6; f++) {
    const face = FACE_TURNS[f * 3];
    const base = CubieCube.fromStickers(applyPerm(solvedStickers(), MOVE_PERMS[face]));
    const twice = base.clone().multiply(base);
    const thrice = twice.clone().multiply(base);
    moves.push(base, twice, thrice);
  }
  return moves;
})());

/** Face index (0..5, in U R F D L B order) of a face-turn index. */
export function turnFace(m) {
  return (m / 3) | 0;
}

/** True when a turn belongs to the phase-2 group <U, D, R2, L2, F2, B2>. */
export function isPhase2Turn(m) {
  const f = turnFace(m);
  return f === 0 || f === 3 || m % 3 === 1;
}
