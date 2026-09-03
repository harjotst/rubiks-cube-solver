/**
 * Sticker-level model of a 3×3×3 Rubik's cube.
 *
 * This is the JavaScript port of the original `RubiksCube` class
 * (solver/rubiks-cube.cpp and heuristics-generator/rubiks_cube.py). It keeps
 * the original conventions so that the old code is still recognisable:
 *
 *   faces:  0 = L (orange), 1 = F (blue), 2 = R (red),
 *           3 = B (green),  4 = U (yellow), 5 = D (white)
 *
 *   net:            [U]
 *           [L] [F] [R] [B]
 *                   [D]
 *
 * Every face is a 3×3 grid stored row-major, so sticker `i` lives at
 * face `i / 9`, row `(i % 9) / 3`, column `i % 3`. Row 0 of the four side
 * faces touches U; column 0 of F touches L, column 0 of R touches F, and so
 * on around the ring. U's bottom row touches F, D's top row touches F.
 *
 * The original code turned the cube with four primitive operations
 * (rotate a face, a row, a column, or a front/back layer). Those primitives
 * are ported verbatim below, but instead of running them on every move we run
 * each of them once against an identity-labelled cube to derive a sticker
 * permutation. Applying a move is then a single 54-element gather, which is
 * what makes the search fast enough for a browser.
 *
 * Fixes relative to the original:
 *   - `Fw` turned the wrong way (it performed Fw').
 *   - `x'` rotated the R face clockwise instead of anticlockwise.
 *   - wide moves, rotations and slice moves are now derived from the basic
 *     turns, so they cannot drift out of sync with them.
 *   - unknown moves throw instead of being silently ignored.
 */

export const L = 0;
export const F = 1;
export const R = 2;
export const B = 3;
export const U = 4;
export const D = 5;

export const FACE_LETTERS = Object.freeze(['L', 'F', 'R', 'B', 'U', 'D']);
export const FACE_INDEX = Object.freeze({ L, F, R, B, U, D });
export const COLOR_NAMES = Object.freeze(['orange', 'blue', 'red', 'green', 'yellow', 'white']);
export const COLOR_EMOJI = Object.freeze(['🟧', '🟦', '🟥', '🟩', '🟨', '⬜']);

/** Index of the sticker at `face`, `row`, `col` in the 54-element array. */
export function stickerIndex(face, row, col) {
  return face * 9 + row * 3 + col;
}

/** A fresh, solved sticker array: every sticker carries its face's colour. */
export function solvedStickers() {
  const s = new Uint8Array(54);
  for (let i = 0; i < 54; i++) s[i] = (i / 9) | 0;
  return s;
}

// ---------------------------------------------------------------------------
// Primitive operations (ported from the original, operate in place)
// ---------------------------------------------------------------------------

/** Rotate one face's 3×3 grid. "Clockwise" is as seen from outside the cube. */
function rotateFace(s, face, clockwise, times = 1) {
  const o = face * 9;
  for (let t = 0; t < times; t++) {
    const old = Array.from(s.subarray ? s.subarray(o, o + 9) : s.slice(o, o + 9));
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        s[o + r * 3 + c] = clockwise ? old[(2 - c) * 3 + r] : old[c * 3 + (2 - r)];
      }
    }
  }
}

/** Cycle one row of stickers around the L-F-R-B ring. `left` sends F's row to L. */
function rotateRow(s, row, left, times = 1) {
  for (let t = 0; t < times; t++) {
    const rows = [];
    for (let f = 0; f < 4; f++) rows.push([s[f * 9 + row * 3], s[f * 9 + row * 3 + 1], s[f * 9 + row * 3 + 2]]);
    const from = left ? [1, 2, 3, 0] : [3, 0, 1, 2];
    for (let f = 0; f < 4; f++) {
      for (let c = 0; c < 3; c++) s[f * 9 + row * 3 + c] = rows[from[f]][c];
    }
  }
}

/** Cycle one column of stickers through F, U, B, D. `down` sends U's column to F. */
function rotateColumn(s, column, down, times = 1) {
  const oc = column === 1 ? 1 : column === 0 ? 2 : 0; // B is mirrored in the net
  const at = (face, r, c) => face * 9 + r * 3 + c;
  for (let t = 0; t < times; t++) {
    if (down) {
      const temp = [s[at(F, 0, column)], s[at(F, 1, column)], s[at(F, 2, column)]];
      for (let i = 0; i < 3; i++) s[at(F, i, column)] = s[at(U, i, column)];
      for (let i = 0; i < 3; i++) s[at(U, i, column)] = s[at(B, 2 - i, oc)];
      for (let i = 0; i < 3; i++) s[at(B, i, oc)] = s[at(D, 2 - i, column)];
      for (let i = 0; i < 3; i++) s[at(D, i, column)] = temp[i];
    } else {
      const temp = [s[at(U, 0, column)], s[at(U, 1, column)], s[at(U, 2, column)]];
      for (let i = 0; i < 3; i++) s[at(U, i, column)] = s[at(F, i, column)];
      for (let i = 0; i < 3; i++) s[at(F, i, column)] = s[at(D, i, column)];
      for (let i = 0; i < 3; i++) s[at(D, i, column)] = s[at(B, 2 - i, oc)];
      for (let i = 0; i < 3; i++) s[at(B, i, oc)] = temp[2 - i];
    }
  }
}

/** Cycle the ring of stickers around a front/back layer (0 = F side, 2 = B side). */
function rotateLayer(s, layer, clockwise, times = 1) {
  const [lCol, tRow, rCol, bRow] = layer === 0 ? [2, 2, 0, 0] : layer === 1 ? [1, 1, 1, 1] : [0, 0, 2, 2];
  const at = (face, r, c) => face * 9 + r * 3 + c;
  for (let t = 0; t < times; t++) {
    const left = [0, 1, 2].map((i) => s[at(L, i, lCol)]);
    const top = [0, 1, 2].map((i) => s[at(U, tRow, i)]);
    const right = [0, 1, 2].map((i) => s[at(R, i, rCol)]);
    const bottom = [0, 1, 2].map((i) => s[at(D, bRow, i)]);
    for (let i = 0; i < 3; i++) {
      if (clockwise) {
        s[at(L, i, lCol)] = bottom[i];
        s[at(U, tRow, i)] = left[2 - i];
        s[at(R, i, rCol)] = top[i];
        s[at(D, bRow, i)] = right[2 - i];
      } else {
        s[at(L, i, lCol)] = top[2 - i];
        s[at(U, tRow, i)] = right[i];
        s[at(R, i, rCol)] = bottom[2 - i];
        s[at(D, bRow, i)] = left[i];
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Move definitions
// ---------------------------------------------------------------------------

/** The nine turns everything else is built from, expressed with the primitives. */
const PRIMITIVE_MOVES = {
  U: (s) => { rotateRow(s, 0, true); rotateFace(s, U, true); },
  D: (s) => { rotateRow(s, 2, false); rotateFace(s, D, true); },
  R: (s) => { rotateColumn(s, 2, false); rotateFace(s, R, true); },
  L: (s) => { rotateColumn(s, 0, true); rotateFace(s, L, true); },
  F: (s) => { rotateLayer(s, 0, true); rotateFace(s, F, true); },
  B: (s) => { rotateLayer(s, 2, false); rotateFace(s, B, true); },
  M: (s) => rotateColumn(s, 1, true),   // middle slice, turns like L
  E: (s) => rotateRow(s, 1, false),     // equatorial slice, turns like D
  S: (s) => rotateLayer(s, 1, true),    // standing slice, turns like F
};

/** Wide turns and whole-cube rotations, as sequences of the moves above. */
const COMPOSITE_MOVES = {
  x: ['R', "M'", "L'"],
  y: ['U', "E'", "D'"],
  z: ['F', 'S', "B'"],
  Uw: ['U', "E'"],
  Dw: ['D', 'E'],
  Rw: ['R', "M'"],
  Lw: ['L', 'M'],
  Fw: ['F', 'S'],
  Bw: ['B', "S'"],
};

/** Lower-case wide-move aliases (SiGN notation). */
const ALIASES = { u: 'Uw', d: 'Dw', r: 'Rw', l: 'Lw', f: 'Fw', b: 'Bw' };

/**
 * perm[i] is the index the sticker now at `i` came from. Applying two
 * permutations in sequence (first `a`, then `b`) composes as a[b[i]].
 */
function identityPerm() {
  const p = new Uint8Array(54);
  for (let i = 0; i < 54; i++) p[i] = i;
  return p;
}

function composePerms(a, b) {
  const out = new Uint8Array(54);
  for (let i = 0; i < 54; i++) out[i] = a[b[i]];
  return out;
}

function permFromPrimitive(apply) {
  const p = identityPerm();
  apply(p);
  return p;
}

/** name → Uint8Array(54) sticker permutation, for every supported move. */
export const MOVE_PERMS = (() => {
  const perms = {};
  const addPowers = (name, p) => {
    const p2 = composePerms(p, p);
    perms[name] = p;
    perms[name + '2'] = p2;
    perms[name + "'"] = composePerms(p2, p);
  };
  for (const [name, apply] of Object.entries(PRIMITIVE_MOVES)) addPowers(name, permFromPrimitive(apply));
  for (const [name, seq] of Object.entries(COMPOSITE_MOVES)) {
    let p = identityPerm();
    for (const m of seq) p = composePerms(p, perms[m]);
    addPowers(name, p);
  }
  for (const [alias, target] of Object.entries(ALIASES)) {
    perms[alias] = perms[target];
    perms[alias + '2'] = perms[target + '2'];
    perms[alias + "'"] = perms[target + "'"];
  }
  return Object.freeze(perms);
})();

/** Canonical move names (aliases excluded), in a stable order. */
export const MOVE_NAMES = Object.freeze(Object.keys(MOVE_PERMS).filter((n) => !(n[0] in ALIASES)));

/** The 18 face turns the solver searches over, in the solver's order. */
export const FACE_TURNS = Object.freeze([
  'U', 'U2', "U'", 'R', 'R2', "R'", 'F', 'F2', "F'",
  'D', 'D2', "D'", 'L', 'L2', "L'", 'B', 'B2', "B'",
]);

/** Apply a sticker permutation, returning a new array. */
export function applyPerm(stickers, perm) {
  const out = new Uint8Array(54);
  for (let i = 0; i < 54; i++) out[i] = stickers[perm[i]];
  return out;
}

// ---------------------------------------------------------------------------
// Notation
// ---------------------------------------------------------------------------

const MOVE_TOKEN = /^([UDRLFBMESxyz]w?|[udrlfb])(2'|'2|2|'|3)?$/;

/** Normalise one token ("r2", "F’", "R3") to its canonical name, or null. */
export function normalizeMove(token) {
  if (typeof token !== 'string') return null;
  const m = MOVE_TOKEN.exec(token.replace(/[’‘′`´]/g, "'"));
  if (!m) return null;
  let base = m[1];
  if (base in ALIASES) base = ALIASES[base];
  let suffix = m[2] || '';
  if (suffix === '3') suffix = "'";
  else if (suffix === "2'" || suffix === "'2") suffix = '2';
  const name = base + suffix;
  return name in MOVE_PERMS ? name : null;
}

/**
 * Parse a move sequence such as "R U R' U'" (or an array of tokens) into
 * canonical move names. Throws on the first token it does not understand.
 */
export function parseMoves(input) {
  if (Array.isArray(input)) {
    return input.map((t) => {
      if (typeof t !== 'string') throw new Error(`Unknown move "${t}"`);
      return parseMoves(t);
    }).flat();
  }
  if (typeof input !== 'string') throw new TypeError('parseMoves expects a string or an array of move names');
  const tokens = input.replace(/[(),[\]]/g, ' ').trim().split(/\s+/).filter(Boolean);
  const out = [];
  for (const token of tokens) {
    const name = normalizeMove(token);
    if (!name) throw new Error(`Unknown move "${token}"`);
    out.push(name);
  }
  return out;
}

/** The move that undoes `move` (any spelling normalizeMove accepts). */
export function inverseMove(move) {
  const m = normalizeMove(move);
  if (!m) throw new Error(`Unknown move "${move}"`);
  if (m.endsWith('2')) return m;
  if (m.endsWith("'")) return m.slice(0, -1);
  return m + "'";
}

/** The sequence that undoes `moves`. */
export function inverseMoves(moves) {
  return moves.slice().reverse().map(inverseMove);
}

/** The face letter (U D R L F B M E S x y z) a move turns. */
export function moveFace(move) {
  return move[0];
}

/** Inverse of a sticker permutation. */
export function invertPerm(perm) {
  const inv = new Uint8Array(54);
  for (let i = 0; i < 54; i++) inv[perm[i]] = i;
  return inv;
}

/** The 24 whole-cube orientations as sticker permutations (identity first). */
export const ROTATION_PERMS = (() => {
  const seen = new Map();
  const queue = [identityPerm()];
  seen.set(queue[0].join(','), queue[0]);
  while (queue.length) {
    const p = queue.shift();
    for (const rot of ['x', 'y', 'z']) {
      const next = composePerms(p, MOVE_PERMS[rot]);
      const key = next.join(',');
      if (!seen.has(key)) {
        seen.set(key, next);
        queue.push(next);
      }
    }
  }
  return Object.freeze(Array.from(seen.values()));
})();

/**
 * The whole-cube rotation that brings every centre back to its home face,
 * or null if the six centres are not one of each colour. Applying the
 * returned permutation to the stickers yields a cube in standard orientation.
 */
export function findOrientation(stickers) {
  for (const r of ROTATION_PERMS) {
    let ok = true;
    for (let f = 0; f < 6 && ok; f++) if (stickers[r[f * 9 + 4]] !== f) ok = false;
    if (ok) return r;
  }
  return null;
}

/**
 * How the 18 face turns are renamed when the cube is held in the
 * orientation `rotation` (a ROTATION_PERMS entry): turning face g on the
 * rotated cube is the same physical turn as face f on the standard one.
 * Returns a map from standard face-turn name to the equivalent name.
 */
export function relabelFaceTurns(rotation) {
  const inverse = invertPerm(rotation);
  const map = {};
  for (const f of FACE_TURNS) {
    const conjugated = composePerms(composePerms(rotation, MOVE_PERMS[f]), inverse).join(',');
    const g = FACE_TURNS.find((name) => MOVE_PERMS[name].join(',') === conjugated);
    if (!g) throw new Error(`No face turn matches ${f} under this rotation`);
    map[f] = g;
  }
  return map;
}

// ---------------------------------------------------------------------------
// The cube
// ---------------------------------------------------------------------------

export class Cube {
  /** @param {ArrayLike<number>} [stickers] 54 colours, defaults to solved. */
  constructor(stickers) {
    if (stickers === undefined || stickers === null) {
      this.stickers = solvedStickers();
    } else {
      if (typeof stickers === 'string' || stickers.length !== 54) throw new Error('A cube has exactly 54 stickers');
      this.stickers = new Uint8Array(54);
      for (let i = 0; i < 54; i++) {
        const v = stickers[i];
        if (!Number.isInteger(v) || v < 0 || v > 5) throw new Error(`Sticker ${i} must be a colour index from 0 to 5 (got ${v})`);
        this.stickers[i] = v;
      }
    }
    /** @type {string[]} moves applied through `move()` so far */
    this.history = [];
  }

  static solved() {
    return new Cube();
  }

  /** Build a cube by applying `moves` to a solved cube. */
  static fromMoves(moves) {
    return new Cube().apply(moves);
  }

  clone() {
    const c = new Cube(this.stickers);
    c.history = this.history.slice();
    return c;
  }

  get(face, row, col) {
    return this.stickers[stickerIndex(face, row, col)];
  }

  set(face, row, col, colour) {
    this.stickers[stickerIndex(face, row, col)] = colour;
    return this;
  }

  /** Apply one move by name. Unknown moves throw. */
  move(name, record = true) {
    const canonical = normalizeMove(name);
    if (!canonical) throw new Error(`Unknown move "${name}"`);
    this.stickers = applyPerm(this.stickers, MOVE_PERMS[canonical]);
    if (record) this.history.push(canonical);
    return this;
  }

  /** Apply a sequence (string or array). */
  apply(moves, record = true) {
    for (const m of parseMoves(moves)) this.move(m, record);
    return this;
  }

  /** Undo the most recent recorded move. */
  undo() {
    const last = this.history.pop();
    if (last) this.move(inverseMove(last), false);
    return this;
  }

  /** True when every face shows a single colour, whichever way the cube is held. */
  isSolved() {
    for (let f = 0; f < 6; f++) {
      const centre = this.stickers[f * 9 + 4];
      for (let k = 0; k < 9; k++) if (this.stickers[f * 9 + k] !== centre) return false;
    }
    return true;
  }

  /** True when the cube is solved and held in the standard orientation. */
  isSolvedInPlace() {
    for (let i = 0; i < 54; i++) if (this.stickers[i] !== ((i / 9) | 0)) return false;
    return true;
  }

  equals(other) {
    const o = other instanceof Cube ? other.stickers : other;
    if (!o || o.length !== 54) return false;
    for (let i = 0; i < 54; i++) if (this.stickers[i] !== o[i]) return false;
    return true;
  }

  /** How many stickers of each colour the cube carries (a solvable cube has nine of each). */
  colourCounts() {
    const counts = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 54; i++) counts[this.stickers[i]]++;
    return counts;
  }

  /** The net as text, one character per sticker, same layout as the original prettyPrint. */
  toString(symbols = FACE_LETTERS) {
    const row = (face, r) => symbols[this.get(face, r, 0)] + symbols[this.get(face, r, 1)] + symbols[this.get(face, r, 2)];
    const pad = '    ';
    const lines = [];
    for (let r = 0; r < 3; r++) lines.push(pad + row(U, r));
    for (let r = 0; r < 3; r++) lines.push(row(L, r) + ' ' + row(F, r) + ' ' + row(R, r) + ' ' + row(B, r));
    for (let r = 0; r < 3; r++) lines.push(pad + row(D, r));
    return lines.join('\n');
  }

  /** The emoji net the original printed. */
  prettyPrint() {
    return this.toString(COLOR_EMOJI);
  }
}
