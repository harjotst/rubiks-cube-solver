/**
 * Page controller: wires the 3D cube, the net editor, the move buttons, the
 * solver worker and the solution player together.
 *
 * Every change to the cube goes through one queue of moves (`enqueueMove`)
 * so that animations play in order, the model is only updated when a move's
 * animation ends, and anything that needs the cube at rest (solving,
 * resetting, painting) can `flush()` the queue first.
 */

import { Cube, parseMoves, inverseMove, normalizeMove } from '../src/cube.js';
import { checkCube } from '../src/solver.js';
import { randomMoves } from '../src/scramble.js';
import { Cube3D } from './cube3d.js';
import { Net } from './net.js';
import { SolverClient } from './solver-client.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const BLANK = 6;
const SCRAMBLE_LENGTH = 25;
const EFFORT = {
  quick: { maxLength: 22, timeLimitMs: 500 },
  balanced: { maxLength: 20, timeLimitMs: 1500 },
  thorough: { maxLength: 19, timeLimitMs: 6000 },
};
const COLOUR_NAMES = ['orange', 'blue', 'red', 'green', 'yellow', 'white'];

const state = {
  cube: Cube.solved(),
  /** moves applied to the cube since it was last solved or painted, newest last */
  history: [],
  /** true while `history` starts from a solved cube, so the URL can describe the cube */
  historyFromSolved: true,
  paint: null,
  paintColour: 4,
  solution: null,
  playing: false,
  solving: false,
  ready: false,
  speed: 1,
  pending: [],
  running: null,
  fastForward: false,
};

const els = {
  scene: $('#scene'),
  net: $('#net'),
  cubeStatus: $('#cube-status'),
  moves: $('#moves'),
  rotations: $('#rotations'),
  scrambleForm: $('#scramble-form'),
  scrambleInput: $('#scramble-input'),
  scrambleApply: $('#scramble-form button[type=submit]'),
  scrambleMessage: $('#scramble-message'),
  randomScramble: $('#random-scramble'),
  resetCube: $('#reset-cube'),
  undoMove: $('#undo-move'),
  paintStart: $('#paint-start'),
  paintUse: $('#paint-use'),
  paintCancel: $('#paint-cancel'),
  paintClear: $('#paint-clear'),
  paintTools: $('#paint-tools'),
  palette: $('#palette'),
  paintMessage: $('#paint-message'),
  effort: $('#effort'),
  solve: $('#solve'),
  solverStatus: $('#solver-status'),
  solverProgress: $('#solver-progress'),
  solveMessage: $('#solve-message'),
  solution: $('#solution'),
  solutionStats: $('#solution-stats'),
  solutionMoves: $('#solution-moves'),
  playerFirst: $('#player-first'),
  playerPrev: $('#player-prev'),
  playerPlay: $('#player-play'),
  playerNext: $('#player-next'),
  playerLast: $('#player-last'),
  speed: $('#speed'),
  copySolution: $('#copy-solution'),
  themeToggle: $('#theme-toggle'),
  shortcuts: $('#shortcuts'),
  announcer: $('#announcer'),
};

/** Say something to screen readers without changing what sighted users see. */
function announce(text) {
  els.announcer.textContent = '';
  setTimeout(() => {
    els.announcer.textContent = text;
  }, 50);
}

function focusIfPossible(el) {
  if (el && !el.disabled && !el.hidden) el.focus({ preventScroll: true });
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

const cube3d = new Cube3D(els.scene);
const net = new Net(els.net, paintSticker);

function currentStickers() {
  return state.paint || state.cube.stickers;
}

function syncViews() {
  const stickers = currentStickers();
  cube3d.setStickers(stickers);
  net.setStickers(stickers);
  let label = 'Scrambled';
  let kind = 'scrambled';
  if (state.paint) {
    label = 'Painting';
    kind = 'painting';
  } else if (state.cube.isSolved()) {
    label = 'Solved';
    kind = 'solved';
  }
  els.cubeStatus.textContent = label;
  els.cubeStatus.dataset.kind = kind;
  syncHash();
  updateControls();
}

/** Controls that change the cube are locked while painting or solving. */
function updateControls() {
  const painting = !!state.paint;
  const locked = painting || state.solving;
  for (const btn of $$('#moves button, #rotations button')) btn.disabled = locked;
  els.randomScramble.disabled = locked;
  els.resetCube.disabled = locked;
  els.scrambleInput.disabled = locked;
  els.scrambleApply.disabled = locked;
  els.undoMove.disabled = locked || state.history.length === 0;
  els.paintStart.disabled = locked;
  els.paintStart.hidden = painting;
  els.paintTools.hidden = !painting;
  els.solve.disabled = painting || !state.ready || state.solving;
  els.effort.disabled = state.solving;
  if (state.solution) renderPlayer();
}

function fitCube() {
  const width = els.scene.clientWidth || 360;
  const size = Math.max(34, Math.min(76, Math.floor(width / 5.4)));
  cube3d.setSize(size);
}

// ---------------------------------------------------------------------------
// The move queue
// ---------------------------------------------------------------------------

function moveDuration(base = 300) {
  return reducedMotion.matches ? 0 : base / state.speed;
}

/** Queue one move; resolves when its animation has ended and the model is updated. */
function enqueueMove(move, duration) {
  return new Promise((resolve) => {
    state.pending.push({ move, duration, resolve });
    if (!state.running) state.running = pump();
  });
}

async function pump() {
  while (state.pending.length) {
    const item = state.pending.shift();
    const duration = state.fastForward ? 0 : item.duration;
    try {
      await cube3d.animateMove(item.move, duration, () => {
        state.cube.move(item.move, false);
        syncViews();
      });
    } catch (err) {
      console.error(err);
    }
    item.resolve();
  }
  state.running = null;
  state.fastForward = false;
}

/** Apply every queued move immediately and wait until the cube is at rest. */
async function flush() {
  state.fastForward = true;
  cube3d.finishAnimation();
  while (state.running) await state.running;
  state.fastForward = false;
}

function applyMoves(moves, { duration = moveDuration(), record = true } = {}) {
  let last = Promise.resolve();
  for (const move of moves) {
    if (record) state.history.push(move);
    last = enqueueMove(move, duration);
  }
  return last;
}

function manualMove(move) {
  if (state.paint || state.solving) return;
  clearSolution();
  applyMoves([move]);
}

function undoMove() {
  if (state.paint || state.solving || state.history.length === 0) return;
  clearSolution();
  const move = state.history.pop();
  enqueueMove(inverseMove(move), moveDuration());
  if (state.history.length === 0) focusIfPossible(els.resetCube);
}

function setSolvedState() {
  state.cube = Cube.solved();
  state.history = [];
  state.historyFromSolved = true;
  syncViews();
}

async function resetCube() {
  if (state.paint || state.solving) return;
  clearSolution();
  await flush();
  setSolvedState();
}

// ---------------------------------------------------------------------------
// Scramble
// ---------------------------------------------------------------------------

/** The URL hash always holds the moves that reproduce the cube on screen. */
function syncHash() {
  const url = new URL(location.href);
  const wanted = state.historyFromSolved && state.history.length ? '#' + encodeURIComponent(state.history.join(' ')) : '';
  if (url.hash === wanted) return;
  url.hash = wanted;
  history.replaceState(null, '', url.toString());
}

function showScrambleMessage(text, isError = false) {
  els.scrambleMessage.hidden = !text;
  els.scrambleMessage.classList.toggle('error', isError);
  els.scrambleMessage.textContent = text;
  if (isError) els.scrambleInput.setAttribute('aria-invalid', 'true');
  else els.scrambleInput.removeAttribute('aria-invalid');
}

/** Apply a typed sequence on top of the current cube. */
async function applyScramble(text, { animateMoves = true } = {}) {
  if (state.paint || state.solving) return false;
  let moves;
  try {
    moves = parseMoves(text);
  } catch (err) {
    showScrambleMessage(err.message, true);
    return false;
  }
  showScrambleMessage('');
  if (moves.length === 0) return false;
  clearSolution();
  await applyMoves(moves, { duration: animateMoves ? moveDuration(110) : 0 });
  return true;
}

/** A fresh random scramble from the solved cube. */
async function randomScramble() {
  if (state.paint || state.solving) return;
  clearSolution();
  await flush();
  setSolvedState();
  const moves = randomMoves(SCRAMBLE_LENGTH);
  els.scrambleInput.value = moves.join(' ');
  showScrambleMessage('');
  await applyMoves(moves, { duration: moveDuration(110) });
}

// ---------------------------------------------------------------------------
// Painting
// ---------------------------------------------------------------------------

function showPaintMessage(text, isError = false) {
  els.paintMessage.hidden = !text;
  els.paintMessage.classList.toggle('error', isError);
  els.paintMessage.textContent = text;
}

async function startPaint() {
  if (state.paint || state.solving) return;
  clearSolution();
  await flush();
  state.paint = Uint8Array.from(state.cube.stickers);
  net.setPainting(true);
  showPaintMessage('Pick a colour (or press 1 to 6), then click stickers on the net. Centres stay fixed: they tell the solver which face is which.');
  syncViews();
  focusIfPossible(els.palette.querySelector('button'));
}

function paintSticker(index) {
  if (!state.paint || index % 9 === 4) return;
  state.paint[index] = state.paintColour;
  syncViews();
}

function selectColour(colour) {
  state.paintColour = colour;
  for (const btn of els.palette.querySelectorAll('button')) {
    btn.setAttribute('aria-pressed', String(Number(btn.dataset.colour) === colour));
  }
}

function clearPaint() {
  if (!state.paint) return;
  for (let i = 0; i < 54; i++) if (i % 9 !== 4) state.paint[i] = BLANK;
  showPaintMessage('Blank cube. Paint all 48 stickers, then choose "Use this cube".');
  syncViews();
}

function usePaint() {
  if (!state.paint) return;
  const blanks = Array.from(state.paint).filter((c) => c === BLANK).length;
  if (blanks > 0) {
    showPaintMessage(`${blanks} sticker${blanks === 1 ? ' is' : 's are'} still blank.`, true);
    return;
  }
  const problem = checkCube(state.paint);
  if (problem) {
    showPaintMessage(`This cube cannot exist. ${problem}`, true);
    return;
  }
  state.cube = new Cube(state.paint);
  state.history = [];
  state.historyFromSolved = state.cube.isSolved();
  els.scrambleInput.value = '';
  showScrambleMessage('');
  exitPaint();
}

function cancelPaint() {
  exitPaint();
}

function exitPaint() {
  state.paint = null;
  net.setPainting(false);
  showPaintMessage('');
  syncViews();
  focusIfPossible(els.paintStart);
}

// ---------------------------------------------------------------------------
// Solving
// ---------------------------------------------------------------------------

const client = new SolverClient({
  onProgress(stage, done, total) {
    if (stage === 'ready') return;
    els.solverStatus.textContent = `Preparing the solver (${done + 1} of ${total}): ${stage}…`;
    els.solverProgress.value = done;
    els.solverProgress.max = total;
    els.solverProgress.hidden = false;
  },
  onReady({ buildMs, inWorker }) {
    state.ready = true;
    els.solverProgress.hidden = true;
    const seconds = (buildMs / 1000).toFixed(1);
    els.solverStatus.textContent = `Ready. Four pattern databases (4.0 million entries) built in ${seconds} s${inWorker ? '' : ' on the main thread'}.`;
    els.solverStatus.classList.add('ready');
    updateControls();
  },
  onFatal(message) {
    els.solverProgress.hidden = true;
    els.solverStatus.textContent = `The solver could not start: ${message}`;
    els.solverStatus.classList.add('error');
  },
});

function showSolveMessage(text, isError = false) {
  els.solveMessage.hidden = !text;
  els.solveMessage.classList.toggle('error', isError);
  els.solveMessage.textContent = text;
}

function clearSolution() {
  state.playing = false;
  state.solution = null;
  els.solution.hidden = true;
  els.solutionMoves.innerHTML = '';
  showSolveMessage('');
}

async function solve() {
  if (!state.ready || state.solving || state.paint) return;
  state.solving = true;
  els.solve.textContent = 'Solving…';
  announce('Solving');
  updateControls();
  try {
    await flush();
    clearSolution();
    if (state.cube.isSolved()) {
      showSolveMessage('The cube is already solved. Scramble it, or paint in your own.');
      return;
    }
    const snapshot = Uint8Array.from(state.cube.stickers);
    const result = await client.solve(snapshot, EFFORT[els.effort.value] || EFFORT.balanced);
    if (!state.cube.equals(snapshot)) return; // the cube changed while we were solving
    state.solution = { moves: result.moves, position: 0, result };
    renderSolution();
    announce(`Solution found: ${describeResult(result)}. ${result.moves.join(' ')}`);
    focusIfPossible(els.playerPlay);
  } catch (err) {
    showSolveMessage(err.message, true);
  } finally {
    state.solving = false;
    els.solve.textContent = 'Solve';
    updateControls();
  }
}

function describeResult(r) {
  const parts = [`${r.length} move${r.length === 1 ? '' : 's'}`];
  if (r.optimal) parts.push('the shortest possible');
  else parts.push(`${r.phase1Length} to orient every piece, ${r.phase2Length} to finish`);
  parts.push(`found in ${(r.elapsedMs / 1000).toFixed(2)} s`);
  if (r.timedOut) parts.push('time budget used up');
  return parts.join(' · ');
}

function renderSolution() {
  const s = state.solution;
  if (!s) return;
  els.solutionStats.textContent = describeResult(s.result);
  els.solutionMoves.innerHTML = '';
  s.moves.forEach((move, i) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = move;
    chip.setAttribute('aria-label', `Move ${i + 1} of ${s.moves.length}: ${move}`);
    chip.addEventListener('click', () => jumpTo(i + 1));
    els.solutionMoves.appendChild(chip);
  });
  els.solution.hidden = false;
  renderPlayer();
}

function renderPlayer() {
  const s = state.solution;
  if (!s) return;
  const chips = els.solutionMoves.children;
  for (let i = 0; i < chips.length; i++) {
    chips[i].classList.toggle('done', i < s.position);
    chips[i].classList.toggle('current', i === s.position - 1);
    chips[i].setAttribute('aria-current', i === s.position - 1 ? 'step' : 'false');
  }
  const atStart = s.position === 0;
  const atEnd = s.position >= s.moves.length;
  els.playerFirst.disabled = atStart;
  els.playerPrev.disabled = atStart;
  els.playerNext.disabled = atEnd;
  els.playerLast.disabled = atEnd;
  els.playerPlay.disabled = atEnd && !state.playing;
  els.playerPlay.textContent = state.playing ? 'Pause' : atEnd ? 'Done' : 'Play';
  els.solutionStats.dataset.position = `${s.position} / ${s.moves.length}`;
  // Keep keyboard focus on a live control when the one in use switches off.
  const active = document.activeElement;
  if (active && active.disabled) {
    if (active === els.playerNext || active === els.playerLast || active === els.playerPlay) focusIfPossible(els.playerPrev);
    else if (active === els.playerPrev || active === els.playerFirst) focusIfPossible(els.playerNext);
  }
}

/** Solution moves are recorded in the history too, so Undo and the URL stay truthful. */
async function stepForward(duration = moveDuration()) {
  const s = state.solution;
  if (!s || s.position >= s.moves.length) return false;
  const move = s.moves[s.position];
  s.position++;
  renderPlayer();
  state.history.push(move);
  await enqueueMove(move, duration);
  return true;
}

async function stepBack(duration = moveDuration()) {
  const s = state.solution;
  if (!s || s.position === 0) return false;
  s.position--;
  renderPlayer();
  state.history.pop();
  await enqueueMove(inverseMove(s.moves[s.position]), duration);
  return true;
}

async function play() {
  if (state.playing) {
    state.playing = false;
    renderPlayer();
    return;
  }
  if (!state.solution || state.solution.position >= state.solution.moves.length) return;
  state.playing = true;
  renderPlayer();
  while (state.playing && state.solution && (await stepForward())) {
    await delay(reducedMotion.matches ? 250 : 120 / state.speed);
  }
  state.playing = false;
  renderPlayer();
}

async function jumpTo(target) {
  const s = state.solution;
  if (!s) return;
  state.playing = false;
  cube3d.finishAnimation();
  while (s.position < target && (await stepForward(0)));
  while (s.position > target && (await stepBack(0)));
  renderPlayer();
}

async function copySolution() {
  if (!state.solution) return;
  const text = state.solution.moves.join(' ');
  try {
    await navigator.clipboard.writeText(text);
    els.copySolution.textContent = 'Copied';
    announce('Solution copied to the clipboard');
  } catch (err) {
    showSolveMessage(`Copy this by hand: ${text}`);
  }
  setTimeout(() => {
    els.copySolution.textContent = 'Copy';
  }, 1500);
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

const root = document.documentElement;
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function currentTheme() {
  const t = root.getAttribute('data-theme');
  return t === 'light' || t === 'dark' ? t : darkQuery.matches ? 'dark' : 'light';
}

function syncThemeButton() {
  const dark = currentTheme() === 'dark';
  els.themeToggle.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  if (root.getAttribute('data-theme')) {
    for (const m of document.querySelectorAll('meta[name="theme-color"]')) {
      m.setAttribute('content', dark ? '#161514' : '#f6f2eb');
      m.removeAttribute('media');
    }
  }
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

function buildMoveButtons() {
  for (const face of ['U', 'D', 'L', 'R', 'F', 'B']) {
    for (const suffix of ['', "'", '2']) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'move-btn';
      btn.dataset.move = face + suffix;
      btn.textContent = face + suffix;
      btn.setAttribute('aria-label', `${face}${suffix}: turn ${face}${suffix === "'" ? ' anticlockwise' : suffix === '2' ? ' twice' : ' clockwise'}`);
      btn.addEventListener('click', () => manualMove(btn.dataset.move));
      els.moves.appendChild(btn);
    }
  }
  for (const rot of ['x', "x'", 'y', "y'", 'z', "z'"]) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'move-btn move-btn-rotation';
    btn.dataset.move = rot;
    btn.textContent = rot;
    btn.setAttribute('aria-label', `${rot}: rotate the whole cube`);
    btn.addEventListener('click', () => manualMove(rot));
    els.rotations.appendChild(btn);
  }
}

function buildPalette() {
  for (let c = 0; c < 6; c++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `swatch c${c}`;
    btn.dataset.colour = String(c);
    btn.setAttribute('aria-label', `Paint ${COLOUR_NAMES[c]} (key ${c + 1})`);
    btn.setAttribute('aria-pressed', String(c === state.paintColour));
    btn.addEventListener('click', () => selectColour(c));
    els.palette.appendChild(btn);
  }
}

/** Single-key shortcuts only act when nothing else on the page has focus. */
function onKeyDown(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (!els.shortcuts.checked) return;
  const target = e.target;
  const onControl = target && target.closest && target.closest('button, a, input, select, textarea, [tabindex]:not(#scene)');
  if (onControl) return;
  if (state.paint) {
    if (/^[1-6]$/.test(e.key)) selectColour(Number(e.key) - 1);
    return;
  }
  if (state.solution) {
    if (e.key === ' ') {
      e.preventDefault();
      play();
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      state.playing = false;
      stepForward();
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      state.playing = false;
      stepBack();
      return;
    }
  }
  if (e.key.length !== 1 || state.solving) return;
  const lower = e.key.toLowerCase();
  let base = null;
  if ('udrlfbmes'.includes(lower)) base = lower.toUpperCase();
  else if ('xyz'.includes(lower)) base = lower;
  if (!base) return;
  const move = normalizeMove(base + (e.shiftKey ? "'" : ''));
  if (move) {
    e.preventDefault();
    manualMove(move);
  }
}

function loadFromHash(hash) {
  let text = '';
  try {
    text = decodeURIComponent(hash.slice(1)).trim();
  } catch (err) {
    showScrambleMessage("The scramble in this link could not be read.", true);
    return;
  }
  if (!text || document.getElementById(text)) return; // an in-page anchor such as #how
  els.scrambleInput.value = text;
  applyScramble(text, { animateMoves: false });
}

function init() {
  // Read the shared scramble before anything writes the URL from the (empty) history.
  const initialHash = location.hash;
  buildMoveButtons();
  buildPalette();
  els.scrambleForm.addEventListener('submit', (e) => {
    e.preventDefault();
    applyScramble(els.scrambleInput.value);
  });
  els.randomScramble.addEventListener('click', randomScramble);
  els.resetCube.addEventListener('click', resetCube);
  els.undoMove.addEventListener('click', undoMove);
  els.paintStart.addEventListener('click', startPaint);
  els.paintUse.addEventListener('click', usePaint);
  els.paintCancel.addEventListener('click', cancelPaint);
  els.paintClear.addEventListener('click', clearPaint);
  els.solve.addEventListener('click', solve);
  els.playerFirst.addEventListener('click', () => jumpTo(0));
  els.playerPrev.addEventListener('click', () => {
    state.playing = false;
    stepBack();
  });
  els.playerPlay.addEventListener('click', play);
  els.playerNext.addEventListener('click', () => {
    state.playing = false;
    stepForward();
  });
  els.playerLast.addEventListener('click', () => jumpTo(state.solution ? state.solution.moves.length : 0));
  els.speed.addEventListener('input', () => {
    state.speed = Number(els.speed.value) || 1;
  });
  state.speed = Number(els.speed.value) || 1;
  els.copySolution.addEventListener('click', copySolution);
  els.themeToggle.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
    } catch (err) {
      /* storage may be unavailable */
    }
    syncThemeButton();
  });
  if (darkQuery.addEventListener) darkQuery.addEventListener('change', syncThemeButton);
  syncThemeButton();
  try {
    if (localStorage.getItem('shortcuts') === 'off') els.shortcuts.checked = false;
  } catch (err) {
    /* storage may be unavailable */
  }
  els.shortcuts.addEventListener('change', () => {
    try {
      localStorage.setItem('shortcuts', els.shortcuts.checked ? 'on' : 'off');
    } catch (err) {
      /* storage may be unavailable */
    }
  });
  document.addEventListener('keydown', onKeyDown);
  if ('ResizeObserver' in window) new ResizeObserver(fitCube).observe(els.scene);
  else window.addEventListener('resize', fitCube);
  fitCube();
  syncViews();
  client.start();
  loadFromHash(initialHash);
}

// Exposed for end-to-end tests and the browser console.
window.__cubeApp = {
  state,
  cube3d,
  client,
  applyScramble,
  randomScramble,
  solve,
  jumpTo,
  stepForward,
  stepBack,
  resetCube,
  startPaint,
  paintSticker,
  usePaint,
  flush,
  queue: () => flush(),
};

init();
