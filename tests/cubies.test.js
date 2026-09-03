import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Cube, FACE_TURNS, solvedStickers, U, D, F, R, L, B, stickerIndex } from '../src/cube.js';
import { CubieCube, CUBIE_MOVES, CORNERS, EDGES, CORNER_FACELETS, EDGE_FACELETS, CORNER_COLORS, EDGE_COLORS, turnFace, isPhase2Turn } from '../src/cubies.js';
import { randomState, mulberry32, randomMoves } from '../src/scramble.js';

/** Kociemba's published cubie-level definitions of the six basic turns. */
const REFERENCE = {
  U: { cp: [3, 0, 1, 2, 4, 5, 6, 7], co: [0, 0, 0, 0, 0, 0, 0, 0], ep: [3, 0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11], eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  R: { cp: [4, 1, 2, 0, 7, 5, 6, 3], co: [2, 0, 0, 1, 1, 0, 0, 2], ep: [8, 1, 2, 3, 11, 5, 6, 7, 4, 9, 10, 0], eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  F: { cp: [1, 5, 2, 3, 0, 4, 6, 7], co: [1, 2, 0, 0, 2, 1, 0, 0], ep: [0, 9, 2, 3, 4, 8, 6, 7, 1, 5, 10, 11], eo: [0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0] },
  D: { cp: [0, 1, 2, 3, 5, 6, 7, 4], co: [0, 0, 0, 0, 0, 0, 0, 0], ep: [0, 1, 2, 3, 5, 6, 7, 4, 8, 9, 10, 11], eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  L: { cp: [0, 2, 6, 3, 4, 1, 5, 7], co: [0, 1, 2, 0, 0, 2, 1, 0], ep: [0, 1, 10, 3, 4, 5, 9, 7, 8, 2, 6, 11], eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  B: { cp: [0, 1, 3, 7, 4, 5, 2, 6], co: [0, 0, 1, 2, 0, 0, 2, 1], ep: [0, 1, 2, 11, 4, 5, 6, 10, 8, 9, 3, 7], eo: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1] },
};

const plain = (cc) => ({ cp: [...cc.cp], co: [...cc.co], ep: [...cc.ep], eo: [...cc.eo] });

test('the cubie moves derived from the sticker model equal Kociemba\'s reference tables', () => {
  for (const [name, ref] of Object.entries(REFERENCE)) {
    assert.deepEqual(plain(CUBIE_MOVES[FACE_TURNS.indexOf(name)]), ref, name);
  }
  for (let f = 0; f < 6; f++) {
    const base = CUBIE_MOVES[3 * f];
    assert.ok(base.clone().multiply(base).equals(CUBIE_MOVES[3 * f + 1]), 'X2 = X·X');
    assert.ok(base.clone().multiply(base).multiply(base).equals(CUBIE_MOVES[3 * f + 2]), "X' = X·X·X");
    assert.ok(base.clone().multiply(CUBIE_MOVES[3 * f + 2]).isSolved(), "X·X' = identity");
  }
});

test('facelet tables list every sticker exactly once, with the U/D (or F/B) sticker first', () => {
  const all = [...CORNER_FACELETS.flat(), ...EDGE_FACELETS.flat()];
  assert.equal(all.length, 24 + 24);
  assert.equal(new Set(all).size, 48);
  for (let f = 0; f < 6; f++) assert.ok(!all.includes(f * 9 + 4), 'centres are not pieces');
  for (let i = 0; i < 8; i++) {
    const faces = CORNER_FACELETS[i].map((s) => (s / 9) | 0);
    assert.ok(faces[0] === U || faces[0] === D, `${CORNERS[i]} lists its U/D sticker first`);
    assert.equal(faces.map((f) => 'LFRBUD'[f]).sort().join(''), CORNERS[i].split('').sort().join(''), `${CORNERS[i]} touches the right faces`);
  }
  for (let i = 0; i < 12; i++) {
    const faces = EDGE_FACELETS[i].map((s) => (s / 9) | 0);
    const primary = i < 8 ? [U, D] : [F, B];
    assert.ok(primary.includes(faces[0]), `${EDGES[i]} lists its primary sticker first`);
    assert.equal(faces.map((f) => 'LFRBUD'[f]).sort().join(''), EDGES[i].split('').sort().join(''));
  }
  assert.deepEqual([...CORNER_COLORS[0]], [U, R, F]);
  assert.deepEqual([...EDGE_COLORS[8]], [F, R]);
});

test('every single sticker swap of a solved cube is rejected or reported as impossible', () => {
  for (let a = 0; a < 54; a++) {
    for (let b = a + 1; b < 54; b++) {
      const s = solvedStickers();
      if (s[a] === s[b]) continue; // same colour: not a change
      [s[a], s[b]] = [s[b], s[a]];
      let cc = null;
      try {
        cc = CubieCube.fromStickers(s);
      } catch (err) {
        continue; // not real pieces: rejected outright
      }
      assert.notEqual(cc.verify(), null, `swap ${a}↔${b} passed as a legal cube`);
    }
  }
});

test('stickers ↔ cubies round-trips in both directions', () => {
  assert.deepEqual([...CubieCube.solved().toStickers()], [...solvedStickers()]);
  assert.ok(CubieCube.fromStickers(solvedStickers()).isSolved());
  const rng = mulberry32(7);
  for (let i = 0; i < 50; i++) {
    const state = randomState(rng);
    const back = CubieCube.fromStickers(state.toStickers());
    assert.ok(back.equals(state), 'cubie → stickers → cubie');
    assert.equal(back.verify(), null);
    const cube = Cube.fromMoves(randomMoves(30, rng));
    assert.deepEqual([...CubieCube.fromStickers(cube.stickers).toStickers()], [...cube.stickers], 'stickers → cubie → stickers');
  }
});

test('applying a move sequence agrees between the sticker model and the cubie model', () => {
  const rng = mulberry32(99);
  for (let i = 0; i < 100; i++) {
    const moves = randomMoves(20, rng);
    const stickers = Cube.fromMoves(moves).stickers;
    const cubie = CubieCube.solved().applyMoves(moves).toStickers();
    assert.deepEqual([...cubie], [...stickers], moves.join(' '));
  }
  assert.ok(CubieCube.solved().applyMoves("R U R' U'").applyMoves("R U R' U'").applyMoves("R U R' U'").applyMoves("R U R' U'").applyMoves("R U R' U'").applyMoves("R U R' U'").isSolved());
  assert.throws(() => CubieCube.solved().move('x'), /Unknown face turn/);
  assert.throws(() => CubieCube.solved().move(NaN), /Unknown face turn/);
  assert.throws(() => CubieCube.solved().move(1.5), /Unknown face turn/);
  assert.throws(() => CubieCube.solved().applyMoves(null), /expects a string or an array/);
  assert.ok(CubieCube.solved().applyMoves("R U’ (R') u2".replace(' u2', '')).equals(CubieCube.solved().applyMoves([3, 2, 5])), 'spellings and indices agree');
  assert.equal(CubieCube.solved().equals(null), false);
});

test('inverse states cancel and parities behave', () => {
  const rng = mulberry32(3);
  for (let i = 0; i < 20; i++) {
    const s = randomState(rng);
    assert.ok(s.clone().multiply(s.inverse()).isSolved());
    assert.ok(s.inverse().multiply(s).isSolved());
    assert.equal(s.cornerParity(), s.edgeParity());
  }
  assert.equal(CubieCube.solved().move('R').cornerParity(), 1, 'a quarter turn is an odd permutation');
  assert.equal(CubieCube.solved().move('R2').cornerParity(), 0);
  assert.equal(CubieCube.solved().move('R').edgeParity(), 1);
});

test('fromStickers rejects impossible sticker sets with a readable reason', () => {
  const s = solvedStickers();
  assert.throws(() => CubieCube.fromStickers(s.slice(0, 53)), /54/);
  const wrongCount = solvedStickers();
  wrongCount[0] = F;
  assert.throws(() => CubieCube.fromStickers(wrongCount), /8 orange stickers/);
  const wrongCentre = solvedStickers();
  wrongCentre[stickerIndex(U, 1, 1)] = D;
  wrongCentre[stickerIndex(D, 1, 1)] = U;
  assert.throws(() => CubieCube.fromStickers(wrongCentre), /centre of the U face must be yellow/);
  const badCorner = solvedStickers(); // swap the F and L stickers of two corners so one shows U/R/R-like nonsense
  badCorner[stickerIndex(F, 0, 2)] = R; // URF now yellow/red/red
  badCorner[stickerIndex(R, 2, 0)] = F; // DFR gets the blue back, keeping counts at nine
  assert.throws(() => CubieCube.fromStickers(badCorner), /URF corner .* is not a real corner piece/);
  const swappedUF = solvedStickers(); // swap URF's yellow and blue stickers: yellow/blue/red clockwise is a mirror image
  swappedUF[stickerIndex(U, 2, 2)] = F;
  swappedUF[stickerIndex(F, 0, 2)] = U;
  assert.throws(() => CubieCube.fromStickers(swappedUF), /URF corner \(blue\/red\/yellow\) is not a real corner piece/);
  const swappedCorners = solvedStickers(); // exchange the side stickers of DLF and DFR: two real corners, swapped
  swappedCorners[stickerIndex(L, 2, 2)] = F;
  swappedCorners[stickerIndex(F, 2, 0)] = R;
  swappedCorners[stickerIndex(F, 2, 2)] = L;
  swappedCorners[stickerIndex(R, 2, 0)] = F;
  const twoSwapped = CubieCube.fromStickers(swappedCorners);
  assert.equal(twoSwapped.cp[5], 4, 'DLF position holds the DFR piece');
  assert.equal(twoSwapped.cp[4], 5, 'DFR position holds the DLF piece');
  assert.match(twoSwapped.verify(), /Two pieces are swapped/);
  const noUD = solvedStickers(); // give URF three side colours: no yellow/white sticker at all
  noUD[stickerIndex(U, 2, 2)] = L;
  noUD[stickerIndex(L, 0, 2)] = U;
  assert.throws(() => CubieCube.fromStickers(noUD), /URF corner has no yellow or white sticker|UFL corner .* is not a real corner piece/);
  const twoEdgesSwapped = solvedStickers();
  twoEdgesSwapped[stickerIndex(U, 2, 1)] = D; // UF now shows the DF piece
  twoEdgesSwapped[stickerIndex(D, 0, 1)] = U; // DF now shows the UF piece
  const swappedEdges = CubieCube.fromStickers(twoEdgesSwapped);
  assert.equal(swappedEdges.ep[1], 5, 'UF position holds the DF piece');
  assert.equal(swappedEdges.ep[5], 1);
  assert.match(swappedEdges.verify(), /Two pieces are swapped/, 'swapping just two edges is an odd permutation');
  const mirrored = solvedStickers(); // swap the yellow and white stickers of URF and DFR: mirror-image corners
  mirrored[stickerIndex(U, 2, 2)] = D;
  mirrored[stickerIndex(D, 0, 2)] = U;
  assert.throws(() => CubieCube.fromStickers(mirrored), /URF corner \(white\/red\/blue\) is not a real corner piece/);
  const twoBlue = solvedStickers();
  twoBlue[stickerIndex(U, 2, 1)] = B;
  twoBlue[stickerIndex(B, 0, 1)] = U;
  assert.throws(() => CubieCube.fromStickers(twoBlue), /UB edge \(yellow\/yellow\)|UF edge \(green\/blue\)/);
});

test('verify explains twist, flip, and permutation parity problems', () => {
  assert.equal(CubieCube.solved().verify(), null);
  assert.match(new CubieCube(undefined, [3, 0, 0, 0, 0, 0, 0, 0]).verify(), /Invalid corner orientation/);
  assert.match(new CubieCube(undefined, undefined, undefined, [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]).verify(), /Invalid edge orientation/);
  const twisted = CubieCube.solved();
  twisted.co[0] = 1;
  assert.match(twisted.verify(), /corner is twisted/);
  const flipped = CubieCube.solved();
  flipped.eo[0] = 1;
  assert.match(flipped.verify(), /edge is flipped/);
  const swapped = CubieCube.solved();
  [swapped.cp[0], swapped.cp[1]] = [swapped.cp[1], swapped.cp[0]];
  assert.match(swapped.verify(), /parity must match/);
  const dup = CubieCube.solved();
  dup.cp[1] = 0;
  assert.match(dup.verify(), /URF corner appears 2 times/);
  const dupEdge = CubieCube.solved();
  dupEdge.ep[1] = 0;
  assert.match(dupEdge.verify(), /UR edge appears 2 times/);
  // stickers of a twisted corner: rotate URF's three stickers
  const s = solvedStickers();
  const [a, b, c] = CORNER_FACELETS[0];
  [s[a], s[b], s[c]] = [s[c], s[a], s[b]];
  assert.match(CubieCube.fromStickers(s).verify(), /corner is twisted/);
});

test('turnFace and isPhase2Turn classify the 18 turns', () => {
  assert.deepEqual(FACE_TURNS.map((_, m) => turnFace(m)), [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5]);
  const phase2 = FACE_TURNS.filter((_, m) => isPhase2Turn(m));
  assert.deepEqual(phase2, ['U', 'U2', "U'", 'R2', 'F2', 'D', 'D2', "D'", 'L2', 'B2']);
});
