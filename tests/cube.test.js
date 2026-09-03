import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  Cube, MOVE_PERMS, MOVE_NAMES, FACE_TURNS, applyPerm, solvedStickers, stickerIndex,
  parseMoves, normalizeMove, inverseMove, inverseMoves, L, F, R, B, U, D, FACE_LETTERS,
  ROTATION_PERMS, findOrientation, relabelFaceTurns, invertPerm,
} from '../src/cube.js';

const identity = () => Uint8Array.from({ length: 54 }, (_, i) => i);
const isIdentity = (p) => p.every((v, i) => v === i);
const compose = (a, b) => applyPerm(a, b);
const power = (p, n) => {
  let out = identity();
  for (let i = 0; i < n; i++) out = compose(out, p);
  return out;
};
const seq = (moves) => parseMoves(moves).reduce((p, m) => compose(p, MOVE_PERMS[m]), identity());

test('solved stickers carry their face colour and index maths matches the net', () => {
  const s = solvedStickers();
  assert.equal(s.length, 54);
  for (let f = 0; f < 6; f++) for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) assert.equal(s[stickerIndex(f, r, c)], f);
  assert.equal(stickerIndex(U, 2, 2), 44);
});

test('every move is a permutation of the 54 stickers that fixes the centres', () => {
  for (const name of MOVE_NAMES) {
    const p = MOVE_PERMS[name];
    assert.equal(p.length, 54, name);
    assert.deepEqual([...p].sort((a, b) => a - b), [...identity()], `${name} is a bijection`);
    if (!/^[MESxyz]|w/.test(name)) {
      for (let f = 0; f < 6; f++) assert.equal(p[f * 9 + 4], f * 9 + 4, `${name} keeps the ${FACE_LETTERS[f]} centre`);
    }
  }
});

test('quarter turns have order four, X2 is X twice and X\' undoes X', () => {
  const bases = [...new Set(MOVE_NAMES.map((n) => n.replace(/['2]$/, '')))];
  for (const b of bases) {
    const p = MOVE_PERMS[b];
    assert.ok(!isIdentity(p), `${b} does something`);
    assert.ok(!isIdentity(power(p, 2)), `${b} twice is not identity`);
    assert.ok(isIdentity(power(p, 4)), `${b} four times is identity`);
    assert.deepEqual(MOVE_PERMS[b + '2'], power(p, 2), `${b}2`);
    assert.ok(isIdentity(compose(p, MOVE_PERMS[b + "'"])), `${b} then ${b}'`);
  }
});

test('the six face turns move exactly 20 stickers and change every colour count by zero', () => {
  for (const name of ['U', 'D', 'R', 'L', 'F', 'B']) {
    const moved = [...MOVE_PERMS[name]].filter((v, i) => v !== i).length;
    assert.equal(moved, 20, name);
  }
  const cube = Cube.fromMoves("R U F' L2 D B' U2 R' F");
  assert.deepEqual(cube.colourCounts(), [9, 9, 9, 9, 9, 9]);
});

test('U sends the front top row to the left, R sends the front column up (as on a real cube)', () => {
  const u = Cube.solved().move('U');
  assert.equal(u.get(L, 0, 1), F, 'F stickers arrive on L after U');
  assert.equal(u.get(F, 0, 1), R);
  assert.equal(u.get(R, 0, 1), B);
  assert.equal(u.get(B, 0, 1), L);
  assert.equal(u.get(L, 1, 1), L, 'middle rows untouched');
  const r = Cube.solved().move('R');
  assert.equal(r.get(U, 1, 2), F, 'F stickers arrive on U after R');
  assert.equal(r.get(B, 1, 0), U);
  assert.equal(r.get(D, 1, 2), B);
  assert.equal(r.get(F, 1, 2), D);
  const f = Cube.solved().move('F');
  assert.equal(f.get(R, 1, 0), U, 'U stickers arrive on R after F');
  assert.equal(f.get(D, 0, 1), R);
  assert.equal(f.get(L, 1, 2), D);
  assert.equal(f.get(U, 2, 1), L);
  const l = Cube.solved().move('L');
  assert.equal(l.get(F, 1, 0), U, 'U stickers arrive on F after L');
  const b = Cube.solved().move('B');
  assert.equal(b.get(L, 1, 0), U, 'U stickers arrive on L after B');
  const d = Cube.solved().move('D');
  assert.equal(d.get(R, 2, 1), F, 'F stickers arrive on R after D');
});

test('well-known identities hold: (R U R\' U\')^6, (R U)^105, T-perm twice, (F2 R2)^6', () => {
  assert.ok(isIdentity(power(seq("R U R' U'"), 6)));
  assert.ok(!isIdentity(power(seq("R U R' U'"), 3)));
  assert.ok(isIdentity(power(seq('R U'), 105)));
  assert.ok(isIdentity(power(seq("R U R' U' R' F R2 U' R' U' R U R' F'"), 2)));
  assert.ok(isIdentity(power(seq('F2 R2'), 6)));
});

test('opposite faces commute, adjacent faces do not', () => {
  assert.deepEqual(seq('R L'), seq('L R'));
  assert.deepEqual(seq('U D'), seq('D U'));
  assert.deepEqual(seq('F B'), seq('B F'));
  assert.notDeepEqual(seq('R U'), seq('U R'));
});

test('slice moves follow L, D and F; wide moves and rotations are built from them', () => {
  // M turns like L: L M together move the whole left two layers, so L M L' M' fixes the R face.
  const lm = seq("L M L' M'");
  for (let i = R * 9; i < R * 9 + 9; i++) assert.equal(lm[i], i);
  assert.deepEqual(MOVE_PERMS.x, seq("R M' L'"));
  assert.deepEqual(MOVE_PERMS.y, seq("U E' D'"));
  assert.deepEqual(MOVE_PERMS.z, seq("F S B'"));
  assert.deepEqual(MOVE_PERMS.Rw, seq("R M'"));
  assert.deepEqual(MOVE_PERMS.Lw, seq('L M'));
  assert.deepEqual(MOVE_PERMS.Uw, seq("U E'"));
  assert.deepEqual(MOVE_PERMS.Dw, seq('D E'));
  assert.deepEqual(MOVE_PERMS.Fw, seq('F S'), 'Fw is F plus S (the original turned it the wrong way)');
  assert.deepEqual(MOVE_PERMS.Bw, seq("B S'"));
  assert.ok(isIdentity(seq("x x'")), "x' undoes x (the original rotated R the wrong way)");
  assert.deepEqual(MOVE_PERMS["x'"], power(MOVE_PERMS.x, 3));
  // Rotations move whole faces: after x the old F face is on U, after y the old R face is on F.
  const x = Cube.solved().move('x');
  for (let i = 0; i < 9; i++) assert.equal(x.stickers[U * 9 + i], F);
  for (let i = 0; i < 9; i++) assert.equal(x.stickers[D * 9 + i], B);
  const y = Cube.solved().move('y');
  for (let i = 0; i < 9; i++) assert.equal(y.stickers[F * 9 + i], R);
  const z = Cube.solved().move('z');
  for (let i = 0; i < 9; i++) assert.equal(z.stickers[U * 9 + i], L);
  // A rotation followed by its inverse in another notation: y = U Uw' ... simpler: y x y' x' has order 3
  assert.ok(isIdentity(power(seq("x y x' y'"), 3)));
  // Rw is the same as L plus x
  assert.deepEqual(MOVE_PERMS.Rw, seq('L x'));
  assert.deepEqual(MOVE_PERMS.Uw, seq('D y'));
  assert.deepEqual(MOVE_PERMS.Fw, seq('B z'));
});

test('lower-case wide aliases and notation variants normalise', () => {
  assert.equal(normalizeMove('r'), 'Rw');
  assert.equal(normalizeMove("u'"), "Uw'");
  assert.equal(normalizeMove('f2'), 'Fw2');
  assert.equal(normalizeMove('R’'), "R'");
  assert.equal(normalizeMove('R2’'), 'R2');
  assert.equal(normalizeMove('R’2'), 'R2');
  assert.equal(normalizeMove('R3'), "R'");
  assert.equal(normalizeMove("R2'"), 'R2');
  assert.equal(normalizeMove('X'), null);
  assert.equal(normalizeMove('R4'), null);
  assert.deepEqual(parseMoves("R U2 (F' B) [l, x]"), ['R', 'U2', "F'", 'B', 'Lw', 'x']);
  assert.deepEqual(parseMoves(['R', "u'"]), ['R', "Uw'"]);
  assert.deepEqual(parseMoves('   '), []);
  assert.deepEqual(parseMoves('R′ U‘ F`'), ["R'", "U'", "F'"], 'prime, curly and backtick apostrophes');
  assert.throws(() => parseMoves('R Q'), /Unknown move "Q"/);
  assert.throws(() => parseMoves(null), /expects a string/);
  assert.throws(() => parseMoves(['R', null]), /Unknown move "null"/);
  assert.throws(() => Cube.solved().move('Q'), /Unknown move/);
  assert.equal(normalizeMove(null), null);
});

test('inverse moves and sequences undo themselves', () => {
  assert.equal(inverseMove('R'), "R'");
  assert.equal(inverseMove("R'"), 'R');
  assert.equal(inverseMove('R2'), 'R2');
  assert.deepEqual(inverseMoves(['R', 'U2', "F'"]), ['F', 'U2', "R'"]);
  assert.equal(inverseMove('R3'), 'R', 'non-canonical spellings are normalised first');
  assert.equal(inverseMove('R’'), 'R');
  assert.equal(inverseMove('r'), "Rw'");
  assert.throws(() => inverseMove('Q'), /Unknown move/);
  for (const name of MOVE_NAMES) assert.ok(isIdentity(compose(MOVE_PERMS[name], MOVE_PERMS[inverseMove(name)])), name);
  const scramble = "R U F' L2 D B' U2 R' F Rw x M2";
  const cube = Cube.fromMoves(scramble);
  assert.ok(!cube.isSolved());
  cube.apply(inverseMoves(parseMoves(scramble)));
  assert.ok(cube.isSolved());
});

test('Cube records history, undoes, clones and compares', () => {
  const cube = Cube.solved();
  assert.ok(cube.isSolved());
  cube.apply("R U R'");
  assert.deepEqual(cube.history, ['R', 'U', "R'"]);
  const copy = cube.clone();
  assert.ok(cube.equals(copy));
  cube.undo().undo().undo();
  assert.ok(cube.isSolved());
  assert.deepEqual(cube.history, []);
  cube.undo();
  assert.ok(cube.isSolved(), 'undo on empty history is a no-op');
  assert.ok(!cube.equals(copy));
  cube.move('U', false);
  assert.deepEqual(cube.history, [], 'unrecorded moves stay out of history');
  assert.throws(() => new Cube([1, 2, 3]), /54/);
  assert.throws(() => new Cube(new Array(54).fill(9)), /Sticker 0 must be a colour index/);
  assert.throws(() => new Cube(new Array(54).fill('U')), /Sticker 0 must be a colour index/);
  assert.throws(() => new Cube('U'.repeat(54)), /54/);
  assert.equal(cube.equals(null), false);
  assert.equal(cube.equals([1, 2]), false);
  assert.equal(cube.set(U, 0, 0, D).get(U, 0, 0), D);
});

test('toString draws the net in the original layout', () => {
  const lines = Cube.solved().toString().split('\n');
  assert.equal(lines.length, 9);
  assert.equal(lines[0], '    UUU');
  assert.equal(lines[3], 'LLL FFF RRR BBB');
  assert.equal(lines[8], '    DDD');
  const after = Cube.solved().move('U').toString().split('\n');
  assert.equal(after[3], 'FFF RRR BBB LLL', 'top row shifted by U');
  assert.equal(after[4], 'LLL FFF RRR BBB');
  assert.equal(Cube.solved().prettyPrint().split('\n')[0], '    🟨🟨🟨');
});

test('a rotated solved cube still counts as solved, and orientation can be recovered', () => {
  const rotated = Cube.solved().apply("x y' z2");
  assert.ok(rotated.isSolved(), 'every face is one colour');
  assert.ok(!rotated.isSolvedInPlace(), 'but not in the standard orientation');
  assert.ok(Cube.solved().isSolvedInPlace());
  assert.ok(!Cube.fromMoves('R').isSolved());
  assert.equal(ROTATION_PERMS.length, 24);
  assert.equal(new Set(ROTATION_PERMS.map((p) => p.join(','))).size, 24);
  for (const r of ROTATION_PERMS) {
    const back = findOrientation(applyPerm(solvedStickers(), invertPerm(r)));
    assert.ok(back, 'every orientation is recognised');
    assert.deepEqual([...applyPerm(applyPerm(solvedStickers(), invertPerm(r)), back)], [...solvedStickers()]);
  }
  assert.equal(findOrientation(Cube.fromMoves('R U').stickers), ROTATION_PERMS[0], 'face turns keep the orientation');
  const broken = solvedStickers();
  broken[4] = U;
  assert.equal(findOrientation(broken), null);
  // Relabelling: after x, turning the face now on top (old F) is what the standard cube calls F.
  const afterX = Cube.solved().move('x');
  const rotation = findOrientation(afterX.stickers);
  const map = relabelFaceTurns(rotation);
  assert.equal(new Set(Object.values(map)).size, 18);
  for (const f of FACE_TURNS) {
    const viaStandard = afterX.clone().apply(map[f]);            // turn the relabelled face on the rotated cube
    const viaRotation = Cube.solved().move(f).move('x');         // turn f, then rotate: must be the same stickers
    assert.ok(viaStandard.equals(viaRotation), `${f} → ${map[f]} under x`);
  }
});

test('the solver\'s 18 face turns are all distinct and cover U R F D L B with the three powers', () => {
  assert.equal(FACE_TURNS.length, 18);
  assert.equal(new Set(FACE_TURNS.map((m) => MOVE_PERMS[m].join(','))).size, 18);
  assert.deepEqual(FACE_TURNS.slice(0, 3), ['U', 'U2', "U'"]);
  assert.deepEqual(FACE_TURNS.slice(15), ['B', 'B2', "B'"]);
});
