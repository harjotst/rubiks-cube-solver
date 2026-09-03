import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Cube, FACE_TURNS, inverseMoves, parseMoves, U } from '../src/cube.js';
import { CubieCube, CUBIE_MOVES, isPhase2Turn } from '../src/cubies.js';
import { getTwist, getFlip, getSlice } from '../src/coords.js';
import { buildTables, PHASE2_MOVES } from '../src/tables.js';
import { Solver, toCubieCube, simplifyMoves, checkCube } from '../src/solver.js';
import { randomState, randomMoves, mulberry32 } from '../src/scramble.js';

const solver = new Solver(buildTables());
const SUPERFLIP = "U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2";

function assertSolves(state, result) {
  const check = toCubieCube(state).applyMoves(result.moves);
  assert.ok(check.isSolved(), `solution ${result.moves.join(' ')} does not solve the cube`);
  assert.equal(result.length, result.moves.length);
  assert.equal(result.phase1Length + result.phase2Length, result.length);
  for (let i = 1; i < result.moves.length; i++) {
    assert.notEqual(result.moves[i][0], result.moves[i - 1][0], 'no two consecutive turns of the same face');
  }
  for (let i = result.phase1Length; i < result.moves.length; i++) {
    assert.ok(isPhase2Turn(FACE_TURNS.indexOf(result.moves[i])), 'phase-2 moves stay inside G1');
  }
}

test('a solved cube needs no moves', () => {
  const r = solver.solve(Cube.solved());
  assert.deepEqual(r.moves, []);
  assert.equal(r.length, 0);
});

test('one- and two-move scrambles are solved optimally', () => {
  for (const m of FACE_TURNS) {
    const r = solver.solve(m);
    assert.deepEqual(r.moves, inverseMoves([m]), m);
  }
  const rng = mulberry32(1);
  for (let i = 0; i < 40; i++) {
    const scramble = randomMoves(2, rng);
    const r = solver.solve(scramble.join(' '));
    assertSolves(scramble.join(' '), r);
    assert.ok(r.length <= 2, `${scramble.join(' ')} → ${r.moves.join(' ')}`);
  }
});

test('scrambles of up to five moves are solved optimally', () => {
  const rng = mulberry32(2);
  for (let i = 0; i < 40; i++) {
    const scramble = randomMoves(3 + Math.floor(rng() * 3), rng);
    const r = solver.solve(scramble.join(' '));
    assertSolves(scramble.join(' '), r);
    assert.ok(r.optimal, 'flagged optimal');
    assert.ok(r.length <= scramble.length, `${scramble.join(' ')} → ${r.moves.join(' ')}`);
  }
  assert.deepEqual(solver.solve("R U R' U'").moves, ['U', 'R', "U'", "R'"]);
  assert.deepEqual(solver.solve('R L').moves.sort(), ["L'", "R'"]);
});

test('slightly longer scrambles get solutions no longer than the scramble', () => {
  const rng = mulberry32(12);
  for (let i = 0; i < 20; i++) {
    const scramble = randomMoves(6 + Math.floor(rng() * 4), rng);
    const r = solver.solve(scramble.join(' '), { maxLength: scramble.length, timeLimitMs: 2000 });
    assertSolves(scramble.join(' '), r);
    assert.ok(!r.timedOut, `${scramble.join(' ')} ran out of time`);
    assert.ok(r.length <= scramble.length, `${scramble.join(' ')} → ${r.moves.join(' ')}`);
  }
});

test('optimal is only claimed for cubes the exact short search solved', () => {
  const rng = mulberry32(21);
  for (let i = 0; i < 5; i++) {
    const r = solver.solve(randomState(rng));
    assert.equal(r.optimal, false, `random state ${i} claims optimal after ${r.length} moves`);
  }
  const scramble = "R U F' L D";
  const exact = solver.solve(scramble);
  assert.equal(exact.optimal, true);
  assert.equal(exact.length, 5);
  const twoPhase = solver.solve(scramble, { shortDepth: 0 });
  assert.equal(twoPhase.optimal, false, 'shortDepth: 0 skips the exact search');
  assertSolves(scramble, twoPhase);
});

test('a solution is always returned even when the time limit is zero', () => {
  const state = randomState(mulberry32(556));
  const r = solver.solve(state, { maxLength: 10, timeLimitMs: 0 });
  assertSolves(state, r);
  assert.equal(r.timedOut, true);
  assert.ok(r.length > 0);
});

test('solutions never contain two turns of the same face in a row, even across the phase boundary', () => {
  const rng = mulberry32(13);
  for (let i = 0; i < 30; i++) {
    const state = randomState(rng);
    const r = solver.solve(state, { maxLength: 24, timeLimitMs: 1000 });
    assertSolves(state, r);
    for (let j = 2; j < r.moves.length; j++) {
      const a = FACE_TURNS.indexOf(r.moves[j - 2]);
      const b = FACE_TURNS.indexOf(r.moves[j - 1]);
      const c = FACE_TURNS.indexOf(r.moves[j]);
      const same = (x, y) => ((x / 3) | 0) === ((y / 3) | 0);
      const opposite = (x, y) => !same(x, y) && ((x / 3) | 0) % 3 === ((y / 3) | 0) % 3;
      assert.ok(!(same(a, c) && opposite(a, b)), `${r.moves.join(' ')} has a mergeable X Y X pattern at ${j}`);
    }
  }
});

test('random states are solved in at most 24 moves, usually 22 or fewer', () => {
  const rng = mulberry32(4242);
  let over22 = 0;
  let totalMs = 0;
  for (let i = 0; i < 40; i++) {
    const state = randomState(rng);
    const r = solver.solve(state, { maxLength: 22, timeLimitMs: 3000 });
    assertSolves(state, r);
    assert.ok(r.length <= 24, `${r.length} moves`);
    if (r.length > 22) over22++;
    totalMs += r.elapsedMs;
  }
  assert.ok(over22 <= 4, `${over22} of 40 solutions exceeded 22 moves`);
  assert.ok(totalMs / 40 < 1500, `average ${totalMs / 40} ms per solve`);
});

test('accepts every input form and rejects impossible cubes', () => {
  const scramble = randomMoves(20, mulberry32(77));
  const cube = Cube.fromMoves(scramble);
  const fromCube = solver.solve(cube);
  const fromStickers = solver.solve(cube.stickers);
  const fromArray = solver.solve([...cube.stickers]);
  const fromString = solver.solve(scramble.join(' '));
  const fromCubie = solver.solve(CubieCube.fromStickers(cube.stickers));
  for (const r of [fromCube, fromStickers, fromArray, fromString, fromCubie]) assertSolves(cube, r);
  assert.deepEqual(fromStickers.moves, fromCube.moves, 'deterministic for identical input');
  assert.throws(() => solver.solve('R Q'), /Unknown move/);
  assert.throws(() => solver.solve(null), /Expected/);
  assert.throws(() => solver.solve(cube, { shortDepth: -1 }), /shortDepth/);
  assert.throws(() => solver.solve(cube, { timeLimitMs: NaN }), /timeLimitMs/);
  const badCentres = Cube.solved();
  badCentres.stickers[4] = U;
  assert.throws(() => solver.solve(badCentres), /centre stickers/);
  const twisted = CubieCube.solved();
  twisted.co[0] = 1;
  twisted.co[1] = 1;
  twisted.co[2] = 1;
  twisted.co[3] = 1; // total 4 ≡ 1 mod 3
  assert.throws(() => solver.solve(twisted), /corner is twisted/);
  const swapped = Cube.solved();
  const s = swapped.stickers;
  [s[9 + 1], s[36 + 7], s[9 + 7], s[45 + 1]] = [s[45 + 1], s[9 + 7], s[36 + 7], s[9 + 1]];
  assert.throws(() => solver.solve(swapped), /parity|swapped/);
});

test('the superflip and other hard positions are solved', () => {
  const r = solver.solve(SUPERFLIP, { maxLength: 22, timeLimitMs: 5000 });
  assertSolves(SUPERFLIP, r);
  assert.ok(r.length <= 24);
  const checkerboard = 'U2 D2 R2 L2 F2 B2';
  const c = solver.solve(checkerboard);
  assertSolves(checkerboard, c);
  assert.ok(c.length <= 6);
});

function randomG1State(rng) {
  const s = randomState(rng);
  s.co.fill(0);
  s.eo.fill(0);
  const ud = [...s.ep].filter((e) => e < 8);
  const slice = [...s.ep].filter((e) => e >= 8);
  s.ep.set([...ud, ...slice]);
  if (s.cornerParity() !== s.edgeParity()) [s.ep[0], s.ep[1]] = [s.ep[1], s.ep[0]];
  assert.equal(s.verify(), null);
  return s;
}

test('positions already in G1 are solved with phase 2 alone, in at most 18 moves', () => {
  const rng = mulberry32(31);
  let deep = 0;
  for (let i = 0; i < 60; i++) {
    const state = randomG1State(rng);
    const r = solver.solve(state, { maxLength: 18, timeLimitMs: 2000 });
    assertSolves(state, r);
    assert.ok(r.length <= 18, `${r.length} moves`);
    if (!r.optimal) {
      assert.equal(r.phase1Length, 0, `phase 1 should be empty for a G1 cube: ${r.moves.join(' ')}`);
      for (const m of r.moves) assert.ok(isPhase2Turn(FACE_TURNS.indexOf(m)), `${m} is not a G1 move`);
    }
    if (r.length >= 15) deep++;
  }
  assert.ok(deep >= 3, `expected several G1 states needing 15+ moves, got ${deep}`);
});

test('no sequence of four or fewer turns leaves G1 and comes back (the phase-1 prune threshold)', () => {
  // Enumerate canonical words (no same-face repeats, opposite faces in one order) of length <= 4.
  let offenders = 0;
  const walk = (cc, depth, prev, usedNonG1) => {
    if (depth > 0 && usedNonG1 && getTwist(cc) === 0 && getFlip(cc) === 0 && getSlice(cc) === 0) offenders++;
    if (depth === 4) return;
    for (let m = 0; m < 18; m++) {
      const f = (m / 3) | 0;
      const pf = prev < 0 ? -1 : (prev / 3) | 0;
      if (pf === f || pf - 3 === f) continue;
      walk(cc.clone().multiply(CUBIE_MOVES[m]), depth + 1, m, usedNonG1 || !isPhase2Turn(m));
    }
  };
  walk(CubieCube.solved(), 0, -1, false);
  assert.equal(offenders, 0);
});

test('a cube held in another orientation is solved with moves that work on it as given', () => {
  for (const scramble of ['x R U', "R U x'", "z y2 F R' U L", "Rw U M' D2 S", 'x y z']) {
    const cube = Cube.fromMoves(scramble);
    const r = solver.solve(cube, { maxLength: 22, timeLimitMs: 2000 });
    assert.ok(cube.clone().apply(r.moves).isSolved(), `${scramble} → ${r.moves.join(' ')}`);
    for (const m of r.moves) assert.ok(FACE_TURNS.includes(m), 'only face turns in the answer');
  }
  assert.deepEqual(solver.solve('x y z').moves, []);
  assert.deepEqual(solver.solve('x R').moves, ["R'"], 'moves are position-based, so R after x is still undone by R\'');
  assert.deepEqual(solver.solve("y F'").moves, ['F']);
});

test('the time limit is honoured once a first solution exists', () => {
  const state = randomState(mulberry32(555));
  const r = solver.solve(state, { maxLength: 10, timeLimitMs: 100 });
  assertSolves(state, r);
  assert.ok(r.timedOut, 'a 10-move target is unreachable, so the search must time out');
  assert.ok(r.elapsedMs < 1500, `took ${r.elapsedMs} ms`);
  const quick = solver.solve(state, { maxLength: 26, timeLimitMs: 5000 });
  assertSolves(state, quick);
  assert.ok(!quick.timedOut);
  assert.ok(quick.elapsedMs < 1000);
});

test('search effort scales with the target length', () => {
  const state = randomState(mulberry32(808));
  const loose = solver.solve(state, { maxLength: 24, timeLimitMs: 5000 });
  const tight = solver.solve(state, { maxLength: 20, timeLimitMs: 5000 });
  assertSolves(state, loose);
  assertSolves(state, tight);
  assert.ok(tight.length <= loose.length);
  assert.ok(tight.nodes >= loose.nodes);
});

test('solutions can be replayed on the sticker cube', () => {
  const rng = mulberry32(9001);
  for (let i = 0; i < 10; i++) {
    const scramble = randomMoves(25, rng);
    const cube = Cube.fromMoves(scramble);
    const r = solver.solve(cube);
    assert.ok(cube.clone().apply(r.moves).isSolved());
    assert.ok(cube.clone().apply(parseMoves(r.moves.join(' '))).isSolved());
  }
});

test('simplifyMoves merges same-face turns, also across a commuting opposite face', () => {
  assert.deepEqual(simplifyMoves(['R', 'R2']), ["R'"]);
  assert.deepEqual(simplifyMoves(['R', "R'"]), []);
  assert.deepEqual(simplifyMoves(['R', 'R']), ['R2']);
  assert.deepEqual(simplifyMoves(['L', 'R2', 'L2']), ["L'", 'R2']);
  assert.deepEqual(simplifyMoves(['R', 'L2', "R'", 'L2']), []);
  assert.deepEqual(simplifyMoves(['R', 'U', "R'"]), ['R', 'U', "R'"]);
  assert.deepEqual(simplifyMoves(['U', 'D', 'U', 'D']), ['U2', 'D2']);
  assert.deepEqual(simplifyMoves([]), []);
  assert.deepEqual(simplifyMoves(['R’', 'R']), [], 'spellings are normalised before merging');
  assert.deepEqual(simplifyMoves(['R’', 'U']), ["R'", 'U']);
  assert.throws(() => simplifyMoves(['Rw']), /Not a face turn/);
  assert.throws(() => simplifyMoves(['R', 'Q']), /Not a face turn/);
});

test('the Solver constructor rejects tables that did not come from buildTables', () => {
  assert.throws(() => new Solver({}), /tables must come from buildTables/);
  assert.throws(() => new Solver({ ...solver.tables, prunEdgeSlice: new Uint8Array(3) }), /prunEdgeSlice/);
});

test('checkCube explains impossible inputs and accepts legal ones', () => {
  assert.equal(checkCube('R U F'), null);
  assert.equal(checkCube('x R U'), null);
  assert.match(checkCube('R Q'), /Unknown move/);
  const twisted = CubieCube.solved();
  twisted.co[0] = 1;
  assert.match(checkCube(twisted), /corner is twisted/);
  const badCentres = Cube.solved();
  badCentres.stickers[4] = U;
  assert.match(checkCube(badCentres), /centre stickers/);
});
