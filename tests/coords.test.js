import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CubieCube } from '../src/cubies.js';
import {
  N_TWIST, N_FLIP, N_SLICE, N_PERM, N_SLICE_SORTED, binomial, permToIndex, indexToPerm,
  getTwist, setTwist, getFlip, setFlip, getSlice, setSlice,
  getCornerPerm, setCornerPerm, getUDEdgePerm, setUDEdgePerm, getSliceSorted, setSliceSorted,
} from '../src/coords.js';
import { randomState, mulberry32 } from '../src/scramble.js';

test('binomial coefficients', () => {
  assert.equal(binomial(12, 4), 495);
  assert.equal(binomial(11, 4), 330);
  assert.equal(binomial(0, 1), 0);
  assert.equal(binomial(3, 4), 0);
  assert.equal(binomial(5, 0), 1);
  assert.equal(binomial(5, 5), 1);
});

test('permutation indices are a bijection with identity at zero', () => {
  assert.equal(permToIndex([0, 1, 2, 3]), 0);
  assert.equal(permToIndex([3, 2, 1, 0]), 23);
  const seen = new Set();
  for (let i = 0; i < 24; i++) {
    const p = indexToPerm(i, 4);
    assert.equal(permToIndex(p), i);
    seen.add(p.join(','));
  }
  assert.equal(seen.size, 24);
  for (let i = 0; i < N_PERM; i += 97) assert.equal(permToIndex(indexToPerm(i, 8)), i);
  assert.equal(permToIndex(indexToPerm(N_PERM - 1, 8)), N_PERM - 1);
});

test('the solved cube has every coordinate at zero', () => {
  const s = CubieCube.solved();
  assert.equal(getTwist(s), 0);
  assert.equal(getFlip(s), 0);
  assert.equal(getSlice(s), 0);
  assert.equal(getCornerPerm(s), 0);
  assert.equal(getUDEdgePerm(s), 0);
  assert.equal(getSliceSorted(s), 0);
});

test('every coordinate value round-trips through set/get and yields a legal orientation total', () => {
  const cc = CubieCube.solved();
  for (let t = 0; t < N_TWIST; t++) {
    setTwist(cc, t);
    assert.equal(getTwist(cc), t);
    assert.equal(cc.co.reduce((a, b) => a + b, 0) % 3, 0);
  }
  for (let f = 0; f < N_FLIP; f++) {
    setFlip(cc, f);
    assert.equal(getFlip(cc), f);
    assert.equal(cc.eo.reduce((a, b) => a + b, 0) % 2, 0);
  }
  const seenSlices = new Set();
  for (let s = 0; s < N_SLICE; s++) {
    setSlice(cc, s);
    assert.equal(getSlice(cc), s);
    assert.deepEqual([...cc.ep].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 'setSlice leaves a permutation');
    seenSlices.add([...cc.ep].map((e, i) => (e >= 8 ? i : -1)).filter((i) => i >= 0).join(','));
  }
  assert.equal(seenSlices.size, N_SLICE, 'each slice value is a distinct set of positions');
  for (let p = 0; p < N_PERM; p++) {
    setCornerPerm(cc, p);
    assert.equal(getCornerPerm(cc), p);
  }
  for (let p = 0; p < N_PERM; p += 13) {
    setUDEdgePerm(cc, p);
    assert.equal(getUDEdgePerm(cc), p);
    assert.deepEqual([...cc.ep.subarray(8)], [8, 9, 10, 11]);
  }
  for (let p = 0; p < N_SLICE_SORTED; p++) {
    setSliceSorted(cc, p);
    assert.equal(getSliceSorted(cc), p);
    assert.deepEqual([...cc.ep.subarray(0, 8)], [0, 1, 2, 3, 4, 5, 6, 7]);
  }
});

test('coordinates of random states stay in range and slice is 0 exactly when the slice edges are home', () => {
  const rng = mulberry32(11);
  for (let i = 0; i < 200; i++) {
    const s = randomState(rng);
    assert.ok(getTwist(s) < N_TWIST);
    assert.ok(getFlip(s) < N_FLIP);
    assert.ok(getSlice(s) < N_SLICE);
    assert.ok(getCornerPerm(s) < N_PERM);
    const home = s.ep[8] >= 8 && s.ep[9] >= 8 && s.ep[10] >= 8 && s.ep[11] >= 8;
    assert.equal(getSlice(s) === 0, home);
  }
});
