import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CubieCube, CUBIE_MOVES, isPhase2Turn } from '../src/cubies.js';
import { N_SLICE, N_SLICE_SORTED, getTwist, getFlip, getSlice, getCornerPerm, getUDEdgePerm, getSliceSorted } from '../src/coords.js';
import { buildTables, PHASE2_MOVES, N_MOVES } from '../src/tables.js';
import { randomState, mulberry32 } from '../src/scramble.js';

const progress = [];
const tables = buildTables((stage, done, total) => progress.push([stage, done, total]));

test('buildTables reports 11 distinct stages, counting 0..10 of 10 and finishing with "ready"', () => {
  assert.deepEqual(progress.map((p) => p[1]), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.ok(progress.every((p) => p[2] === 10));
  assert.equal(progress[10][0], 'ready');
  assert.equal(new Set(progress.map((p) => p[0])).size, 11);
});

test('phase-2 pruning tables change by at most one per G1 move', () => {
  const rng = mulberry32(10);
  for (let i = 0; i < 500; i++) {
    const s = randomState(rng);
    s.co.fill(0);
    s.eo.fill(0);
    const ud = [...s.ep].filter((e) => e < 8);
    const sl = [...s.ep].filter((e) => e >= 8);
    s.ep.set([...ud, ...sl]);
    if (s.cornerParity() !== s.edgeParity()) [s.ep[0], s.ep[1]] = [s.ep[1], s.ep[0]];
    const cp = getCornerPerm(s);
    const ep = getUDEdgePerm(s);
    const ss = getSliceSorted(s);
    for (const m of PHASE2_MOVES) {
      const cp2 = tables.cornerPermMove[cp * N_MOVES + m];
      const ep2 = tables.udEdgePermMove[ep * N_MOVES + m];
      const ss2 = tables.sliceSortedMove[ss * N_MOVES + m];
      assert.ok(Math.abs(tables.prunCornerSlice[cp * N_SLICE_SORTED + ss] - tables.prunCornerSlice[cp2 * N_SLICE_SORTED + ss2]) <= 1);
      assert.ok(Math.abs(tables.prunEdgeSlice[ep * N_SLICE_SORTED + ss] - tables.prunEdgeSlice[ep2 * N_SLICE_SORTED + ss2]) <= 1);
    }
  }
});

test('phase-1 move tables agree with moving a cube directly', () => {
  const rng = mulberry32(5);
  for (let i = 0; i < 300; i++) {
    const s = randomState(rng);
    const twist = getTwist(s);
    const flip = getFlip(s);
    const slice = getSlice(s);
    for (let m = 0; m < N_MOVES; m++) {
      const moved = s.clone().multiply(CUBIE_MOVES[m]);
      assert.equal(tables.twistMove[twist * N_MOVES + m], getTwist(moved));
      assert.equal(tables.flipMove[flip * N_MOVES + m], getFlip(moved));
      assert.equal(tables.sliceMove[slice * N_MOVES + m], getSlice(moved));
      assert.equal(tables.cornerPermMove[getCornerPerm(s) * N_MOVES + m], getCornerPerm(moved));
    }
  }
});

test('phase-2 move tables agree with moving a G1 cube directly', () => {
  const rng = mulberry32(6);
  for (let i = 0; i < 300; i++) {
    const s = randomState(rng);
    // force into G1: oriented, slice edges home
    s.co.fill(0);
    s.eo.fill(0);
    const ud = [...s.ep].filter((e) => e < 8);
    const sl = [...s.ep].filter((e) => e >= 8);
    s.ep.set([...ud, ...sl]);
    if (s.cornerParity() !== s.edgeParity()) [s.ep[0], s.ep[1]] = [s.ep[1], s.ep[0]];
    assert.equal(s.verify(), null);
    for (const m of PHASE2_MOVES) {
      const moved = s.clone().multiply(CUBIE_MOVES[m]);
      assert.equal(tables.udEdgePermMove[getUDEdgePerm(s) * N_MOVES + m], getUDEdgePerm(moved));
      assert.equal(tables.sliceSortedMove[getSliceSorted(s) * N_MOVES + m], getSliceSorted(moved));
      assert.equal(getTwist(moved), 0, 'G1 moves keep corners oriented');
      assert.equal(getFlip(moved), 0, 'G1 moves keep edges oriented');
      assert.equal(getSlice(moved), 0, 'G1 moves keep the slice edges in the slice');
    }
    for (let m = 0; m < N_MOVES; m++) {
      if (!isPhase2Turn(m)) assert.equal(tables.udEdgePermMove[getUDEdgePerm(s) * N_MOVES + m], 0xffff, 'non-G1 moves are not tabulated for phase-2 coordinates');
    }
  }
});

test('pruning tables are complete, start at zero and change by at most one per move', () => {
  for (const [name, depthName] of [['prunTwistSlice', 'twistSlice'], ['prunFlipSlice', 'flipSlice'], ['prunCornerSlice', 'cornerSlice'], ['prunEdgeSlice', 'edgeSlice']]) {
    const p = tables[name];
    assert.equal(p[0], 0, name);
    let zeros = 0;
    let max = 0;
    for (let i = 0; i < p.length; i++) {
      assert.notEqual(p[i], 255, `${name}[${i}] reached`);
      if (p[i] === 0) zeros++;
      if (p[i] > max) max = p[i];
    }
    assert.equal(zeros, 1, `${name} has exactly one solved state`);
    assert.equal(tables.depths[depthName], max, `${name} reports its deepest entry`);
    assert.ok(max >= 7 && max <= 18, `${name} max depth ${max} is plausible`);
  }
  assert.deepEqual(tables.depths, { twistSlice: 9, flipSlice: 9, cornerSlice: 14, edgeSlice: 12 });
  assert.deepEqual(structuredClone(tables).depths, tables.depths, 'depths survive structured cloning');
  assert.equal(tables.prunTwistSlice.length, 2187 * N_SLICE);
  assert.equal(tables.prunFlipSlice.length, 2048 * N_SLICE);
  assert.equal(tables.prunCornerSlice.length, 40320 * N_SLICE_SORTED);
  assert.equal(tables.prunEdgeSlice.length, 40320 * N_SLICE_SORTED);
  const rng = mulberry32(8);
  for (let i = 0; i < 500; i++) {
    const s = randomState(rng);
    const twist = getTwist(s);
    const flip = getFlip(s);
    const slice = getSlice(s);
    for (let m = 0; m < N_MOVES; m++) {
      const t2 = tables.twistMove[twist * N_MOVES + m];
      const f2 = tables.flipMove[flip * N_MOVES + m];
      const s2 = tables.sliceMove[slice * N_MOVES + m];
      assert.ok(Math.abs(tables.prunTwistSlice[twist * N_SLICE + slice] - tables.prunTwistSlice[t2 * N_SLICE + s2]) <= 1);
      assert.ok(Math.abs(tables.prunFlipSlice[flip * N_SLICE + slice] - tables.prunFlipSlice[f2 * N_SLICE + s2]) <= 1);
    }
  }
});

test('pruning values never exceed the true distance (admissibility on short scrambles)', () => {
  const rng = mulberry32(9);
  for (let trial = 0; trial < 300; trial++) {
    const len = 1 + Math.floor(rng() * 7);
    const s = CubieCube.solved();
    for (let i = 0; i < len; i++) s.multiply(CUBIE_MOVES[Math.floor(rng() * 18)]);
    assert.ok(tables.prunTwistSlice[getTwist(s) * N_SLICE + getSlice(s)] <= len);
    assert.ok(tables.prunFlipSlice[getFlip(s) * N_SLICE + getSlice(s)] <= len);
    const g = CubieCube.solved();
    for (let i = 0; i < len; i++) g.multiply(CUBIE_MOVES[PHASE2_MOVES[Math.floor(rng() * PHASE2_MOVES.length)]]);
    assert.ok(tables.prunCornerSlice[getCornerPerm(g) * N_SLICE_SORTED + getSliceSorted(g)] <= len);
    assert.ok(tables.prunEdgeSlice[getUDEdgePerm(g) * N_SLICE_SORTED + getSliceSorted(g)] <= len);
  }
});
