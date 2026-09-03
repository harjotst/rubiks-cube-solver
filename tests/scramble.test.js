import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, randomState, randomMoves } from '../src/scramble.js';
import { turnFace } from '../src/cubies.js';
import { FACE_TURNS } from '../src/cube.js';

test('mulberry32 is deterministic and in [0, 1)', () => {
  const a = mulberry32(123);
  const b = mulberry32(123);
  for (let i = 0; i < 100; i++) {
    const v = a();
    assert.equal(v, b());
    assert.ok(v >= 0 && v < 1);
  }
  assert.notEqual(mulberry32(1)(), mulberry32(2)());
});

test('random states are always legal and vary', () => {
  const rng = mulberry32(2024);
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    const s = randomState(rng);
    assert.equal(s.verify(), null);
    seen.add(JSON.stringify([[...s.cp], [...s.co], [...s.ep], [...s.eo]]));
  }
  assert.equal(seen.size, 200);
});

test('random move scrambles avoid wasted moves', () => {
  const rng = mulberry32(17);
  for (let trial = 0; trial < 50; trial++) {
    const moves = randomMoves(25, rng);
    assert.equal(moves.length, 25);
    for (let i = 0; i < moves.length; i++) {
      assert.ok(FACE_TURNS.includes(moves[i]));
      const f = turnFace(FACE_TURNS.indexOf(moves[i]));
      if (i > 0) assert.notEqual(f, turnFace(FACE_TURNS.indexOf(moves[i - 1])), 'same face twice');
      if (i > 1) {
        const f1 = turnFace(FACE_TURNS.indexOf(moves[i - 1]));
        const f2 = turnFace(FACE_TURNS.indexOf(moves[i - 2]));
        assert.ok(!(f % 3 === f1 % 3 && f1 % 3 === f2 % 3), 'three turns on one axis');
      }
    }
  }
  assert.deepEqual(randomMoves(0), []);
});
