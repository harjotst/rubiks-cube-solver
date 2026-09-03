import { test, expect } from '@playwright/test';

/** Open the page, wait for the solver, and collect console/page errors. */
async function open(page, hash = '') {
  const errors = [];
  // The web font is decoration; never let its network round trip slow a test down.
  await page.route(/fonts\.g(oogleapis|static)\.com/, (route) => route.abort());
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    const where = (m.location() && m.location().url) || '';
    if (m.type() === 'error' && !/fonts\.g(oogleapis|static)\.com/.test(where + m.text())) errors.push(`console: ${m.text()} (${where})`);
  });
  await page.goto(`/${hash}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__cubeApp && window.__cubeApp.state.ready, null, { timeout: 60000 });
  return errors;
}

const settled = (page) => page.evaluate(() => window.__cubeApp.queue());
const stickers = (page) => page.evaluate(() => Array.from(window.__cubeApp.state.cube.stickers));
const isSolved = (page) => page.evaluate(() => window.__cubeApp.state.cube.isSolved());

/** Every visible 3D face must show the sticker the model holds at that spot. */
async function faceMismatches(page) {
  return page.evaluate(() => {
    const app = window.__cubeApp;
    const st = app.state.paint || app.state.cube.stickers;
    let bad = 0;
    for (const c of app.cube3d.cubies) {
      for (const [f, el] of Object.entries(c.faces)) {
        if (!el.classList.contains('c' + st[app.cube3d.constructor.stickerFor(f, c.x, c.y, c.z)])) bad++;
      }
    }
    return bad;
  });
}

test('the solver starts, reports itself ready, and the page stays free of errors', async ({ page }) => {
  const errors = await open(page);
  await expect(page.locator('#solver-status')).toContainText('Ready');
  await expect(page.locator('#solve')).toBeEnabled();
  await expect(page.locator('#cube-status')).toHaveText('Solved');
  await expect(page.locator('#solution')).toBeHidden();
  expect(await faceMismatches(page)).toBe(0);
  expect(errors).toEqual([]);
});

test('a typed scramble is applied, solved, and played back to a solved cube', async ({ page }) => {
  await open(page);
  const scramble = "R U R' U' F2 D L B' U2 R L2 D' F B2 U R' D2 L' F' B";
  await page.fill('#scramble-input', scramble);
  await page.click('#scramble-form button[type=submit]');
  await page.waitForFunction((n) => window.__cubeApp.state.history.length === n, scramble.split(' ').length);
  await settled(page);
  await expect(page.locator('#cube-status')).toHaveText('Scrambled');
  expect(await page.evaluate(() => location.hash)).toContain('R%20U%20R');
  expect(await faceMismatches(page)).toBe(0);
  const scrambled = await stickers(page);

  await page.click('#solve');
  await expect(page.locator('#solution')).toBeVisible();
  const chips = page.locator('#solution-moves .chip');
  const count = await chips.count();
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThanOrEqual(24);
  await expect(page.locator('#solution-stats')).toContainText(`${count} moves`);

  await page.fill('#speed', '3');
  await page.dispatchEvent('#speed', 'input');
  await page.click('#player-play');
  await page.waitForFunction(() => {
    const s = window.__cubeApp.state.solution;
    return s && s.position === s.moves.length && !window.__cubeApp.state.playing;
  });
  await settled(page);
  expect(await isSolved(page)).toBe(true);
  await expect(page.locator('#cube-status')).toHaveText('Solved');
  await expect(page.locator('#player-play')).toHaveText('Done');
  expect(await faceMismatches(page)).toBe(0);

  await page.click('#player-prev');
  await settled(page);
  expect(await isSolved(page)).toBe(false);
  await page.click('#player-first');
  await settled(page);
  expect(await stickers(page)).toEqual(scrambled);
  await chips.nth(2).click();
  await settled(page);
  expect(await page.evaluate(() => window.__cubeApp.state.solution.position)).toBe(3);
  expect(await chips.nth(2).getAttribute('class')).toContain('current');
});

test('a layer animation ends exactly where the repainted model puts the stickers', async ({ page }) => {
  await open(page, '#R%20U%20F%27%20L2%20D');
  await page.waitForFunction(() => window.__cubeApp.state.history.length === 5);
  await settled(page);
  for (const move of ['U', "R'", 'F2', 'M', 'x', 'Rw']) {
    const rotated = await page.evaluate(async (m) => {
      const { turnGeometry } = await import('./app/cube3d.js');
      const c3 = window.__cubeApp.cube3d;
      const geo = turnGeometry(m);
      const axis = { x: '1, 0, 0', y: '0, 1, 0', z: '0, 0, 1' }[geo.axis];
      for (const c of c3.cubies) {
        if (geo.layers.includes(c[geo.axis])) c.el.style.transform = `rotate3d(${axis}, ${geo.angle}deg) ${c3.baseTransform(c)}`;
      }
      return geo.layers.length;
    }, move);
    expect(rotated).toBeGreaterThan(0);
    const before = await page.locator('#scene').screenshot();
    await page.evaluate((m) => {
      const app = window.__cubeApp;
      app.state.cube.move(m, false);
      app.cube3d.setStickers(app.state.cube.stickers);
      for (const c of app.cube3d.cubies) c.el.style.transform = app.cube3d.baseTransform(c);
    }, move);
    const after = await page.locator('#scene').screenshot();
    const diff = await page.evaluate(async ([a64, b64]) => {
      const load = (b64) => new Promise((res) => {
        const img = new Image();
        img.onload = () => res(img);
        img.src = 'data:image/png;base64,' + b64;
      });
      const [ia, ib] = await Promise.all([load(a64), load(b64)]);
      const w = ia.width;
      const h = ia.height;
      const draw = (img) => {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const g = c.getContext('2d');
        g.drawImage(img, 0, 0);
        return g.getImageData(0, 0, w, h).data;
      };
      const da = draw(ia);
      const db = draw(ib);
      let bad = 0;
      for (let i = 0; i < da.length; i += 4) {
        if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 60) bad++;
      }
      return bad / (w * h);
    }, [before.toString('base64'), after.toString('base64')]);
    expect(diff, `${move}: fraction of pixels that changed when the animation was replaced by the repaint`).toBeLessThan(0.01);
  }
});

test('move buttons, keyboard turns, undo and reset keep the model and the view in step', async ({ page }) => {
  await open(page);
  await page.click('button[data-move="R"]');
  await page.click('button[data-move="U\'"]');
  await page.locator('#scene').focus(); // single-key shortcuts only act when no control has focus
  await page.keyboard.press('f');
  await page.keyboard.press('Shift+F');
  await page.keyboard.press('x');
  await settled(page);
  expect(await page.evaluate(() => window.__cubeApp.state.history)).toEqual(['R', "U'", 'F', "F'", 'x']);
  expect(await faceMismatches(page)).toBe(0);
  await page.click('#undo-move');
  await page.click('#undo-move');
  await page.click('#undo-move');
  await settled(page);
  expect(await page.evaluate(() => window.__cubeApp.state.history)).toEqual(['R', "U'"]);
  await page.click('#reset-cube');
  await settled(page);
  expect(await isSolved(page)).toBe(true);
  await expect(page.locator('#undo-move')).toBeDisabled();
});

test('bad notation is reported without changing the cube', async ({ page }) => {
  await open(page);
  await page.fill('#scramble-input', 'R U Q');
  await page.click('#scramble-form button[type=submit]');
  await expect(page.locator('#scramble-message')).toContainText('Unknown move "Q"');
  expect(await isSolved(page)).toBe(true);
});

test('solving an already solved cube explains itself', async ({ page }) => {
  await open(page);
  await page.click('#solve');
  await expect(page.locator('#solve-message')).toContainText('already solved');
  await expect(page.locator('#solution')).toBeHidden();
});

test('painting: blanks are counted, impossible cubes are explained, valid cubes are solved', async ({ page }) => {
  await open(page);
  await page.click('#paint-start');
  await expect(page.locator('#cube-status')).toHaveText('Painting');
  await expect(page.locator('#solve')).toBeDisabled();
  await page.click('#paint-clear');
  await page.click('#paint-use');
  await expect(page.locator('#paint-message')).toContainText('48 stickers are still blank');
  expect(await faceMismatches(page)).toBe(0);
  await page.click('#paint-cancel');
  await expect(page.locator('#cube-status')).toHaveText('Solved');

  // Twist one corner by clicking stickers in the net.
  await page.click('#paint-start');
  const paint = async (index, colour) => {
    await page.click(`#palette button[data-colour="${colour}"]`);
    await page.click(`#net button[data-index="${index}"]`);
  };
  // URF corner: U(2,2)=44 yellow, R(0,0)=18 red, F(0,2)=11 blue -> rotate them
  await paint(44, 2);
  await paint(18, 1);
  await paint(11, 4);
  await page.click('#paint-use');
  await expect(page.locator('#paint-message')).toContainText('corner is twisted');
  await expect(page.locator('#cube-status')).toHaveText('Painting');

  // Put a real scramble in through the paint API and solve it.
  await page.evaluate(async () => {
    const { Cube } = await import('./src/cube.js');
    const target = Cube.fromMoves("F R U' L2 B D2 F' R2 U B' L D");
    const app = window.__cubeApp;
    for (let i = 0; i < 54; i++) {
      if (i % 9 === 4) continue;
      app.state.paintColour = target.stickers[i];
      app.paintSticker(i);
    }
  });
  await page.click('#paint-use');
  await expect(page.locator('#cube-status')).toHaveText('Scrambled');
  await page.selectOption('#effort', 'quick');
  await page.click('#solve');
  await expect(page.locator('#solution')).toBeVisible();
  await page.click('#player-last');
  await settled(page);
  expect(await isSolved(page)).toBe(true);
});

test('a scramble in the URL is applied on load', async ({ page }) => {
  await open(page, "#R%20U%20F'");
  await page.waitForFunction(() => window.__cubeApp.state.history.length === 3);
  await expect(page.locator('#scramble-input')).toHaveValue("R U F'");
  await expect(page.locator('#cube-status')).toHaveText('Scrambled');
  await settled(page);
  await page.click('#solve');
  await expect(page.locator('#solution-stats')).toContainText('3 moves · the shortest possible');
  const moves = await page.locator('#solution-moves .chip').allTextContents();
  expect(moves).toEqual(['F', "U'", "R'"]);
});

test('the theme toggle switches and remembers the theme', async ({ page }) => {
  await open(page);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.click('#theme-toggle');
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('dark');
  await page.reload();
  await page.waitForFunction(() => window.__cubeApp && window.__cubeApp.state.ready, null, { timeout: 60000 });
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('dark');
  await expect(page.locator('#theme-toggle')).toHaveAttribute('aria-label', 'Switch to light theme');
});

test('the layout has no horizontal overflow on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await open(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  const sceneWidth = await page.locator('#scene').evaluate((el) => el.clientWidth);
  expect(sceneWidth).toBeGreaterThan(250);
});

test('a rotated cube still counts as solved and can be solved after more turns', async ({ page }) => {
  await open(page);
  await page.click('button[data-move="x"]');
  await page.locator('#scene').focus();
  await page.keyboard.press('y');
  await settled(page);
  await expect(page.locator('#cube-status')).toHaveText('Solved');
  await page.click('button[data-move="R"]');
  await page.click('button[data-move="U"]');
  await settled(page);
  await expect(page.locator('#cube-status')).toHaveText('Scrambled');
  await page.click('#solve');
  await expect(page.locator('#solution')).toBeVisible();
  await expect(page.locator('#solution-stats')).toContainText('2 moves · the shortest possible');
  await page.click('#player-last');
  await settled(page);
  expect(await isSolved(page)).toBe(true);
  await expect(page.locator('#cube-status')).toHaveText('Solved');
  // painting after a rotation works too: the centres define the faces
  await page.click('#paint-start');
  await page.click('#paint-use');
  await expect(page.locator('#cube-status')).toHaveText('Solved');
});

test('controls are locked while a solve is running and the solution matches the cube it was asked for', async ({ page }) => {
  await open(page, '#' + encodeURIComponent(randomScrambleText(1)));
  await page.waitForFunction(() => window.__cubeApp.state.history.length === 25);
  await settled(page);
  await page.selectOption('#effort', 'thorough');
  const clicked = page.click('#solve');
  await expect(page.locator('#solve')).toHaveText('Solving…');
  for (const sel of ['button[data-move="R"]', '#random-scramble', '#undo-move', '#reset-cube', '#paint-start', '#scramble-input']) {
    await expect(page.locator(sel), sel).toBeDisabled();
  }
  await page.keyboard.press('r');
  await clicked;
  await expect(page.locator('#solution')).toBeVisible();
  const before = await stickers(page);
  const moves = await page.locator('#solution-moves .chip').allTextContents();
  const solves = await page.evaluate(([st, mv]) => import('./src/cube.js').then(({ Cube }) => new Cube(st).apply(mv).isSolved()), [before, moves]);
  expect(solves).toBe(true);
  await expect(page.locator('button[data-move="R"]')).toBeEnabled();
});

test('random scrambles start from a solved cube and the URL always reproduces the screen', async ({ page }) => {
  await open(page);
  await page.click('#random-scramble');
  await page.waitForFunction(() => window.__cubeApp.state.history.length === 25);
  await settled(page);
  await page.click('#random-scramble');
  await page.waitForFunction(() => window.__cubeApp.state.history.length === 25 && !window.__cubeApp.state.running);
  await settled(page);
  expect(await page.evaluate(() => window.__cubeApp.state.history.length)).toBe(25);
  await page.click('button[data-move="F"]');
  await page.click('#undo-move');
  await page.click('button[data-move="B2"]');
  await settled(page);
  const hash = await page.evaluate(() => decodeURIComponent(location.hash.slice(1)));
  const history = await page.evaluate(() => window.__cubeApp.state.history.join(' '));
  expect(hash).toBe(history);
  expect(hash.endsWith(' B2')).toBe(true);
  const here = await stickers(page);
  const page2 = await page.context().newPage();
  await page2.goto(`/#${encodeURIComponent(hash)}`, { waitUntil: 'domcontentloaded' });
  await page2.waitForFunction((n) => window.__cubeApp && window.__cubeApp.state.history.length === n, hash.split(' ').length);
  await page2.evaluate(() => window.__cubeApp.flush());
  expect(await page2.evaluate(() => Array.from(window.__cubeApp.state.cube.stickers))).toEqual(here);
  await page2.close();
});

test('Reset during a scramble animation takes effect at once', async ({ page }) => {
  await open(page);
  await page.click('#random-scramble');
  await page.waitForTimeout(150);
  await page.click('#reset-cube');
  await settled(page);
  expect(await isSolved(page)).toBe(true);
  expect(await page.evaluate(() => window.__cubeApp.state.history.length)).toBe(0);
  expect(await page.evaluate(() => location.hash)).toBe('');
});

test('Undo after playing a solution reverts the last solution move', async ({ page }) => {
  await open(page, '#R%20U%20F');
  await page.waitForFunction(() => window.__cubeApp.state.history.length === 3);
  await settled(page);
  await page.click('#solve');
  await expect(page.locator('#solution')).toBeVisible();
  await page.click('#player-last');
  await settled(page);
  expect(await isSolved(page)).toBe(true);
  expect(await page.evaluate(() => window.__cubeApp.state.history.length)).toBe(6);
  await page.click('#undo-move');
  await settled(page);
  expect(await page.evaluate(() => window.__cubeApp.state.history.length)).toBe(5);
  await expect(page.locator('#solution')).toBeHidden();
  expect(await isSolved(page)).toBe(false);
});

test('a malformed link is reported instead of breaking the page', async ({ page }) => {
  await open(page, '#R%20U%');
  await expect(page.locator('#scramble-message')).toContainText('could not be read');
  expect(await isSolved(page)).toBe(true);
  await page.click('button[data-move="U"]');
  await settled(page);
  await expect(page.locator('#cube-status')).toHaveText('Scrambled');
});

function randomScrambleText(seed) {
  // A fixed 25-move scramble; the seed just picks between a couple of them.
  const bank = [
    "R U R' U' F2 D L B' U2 R L2 D' F B2 U R' D2 L' F' B U2 R2 F D' L",
    "L2 D F' U R B2 D2 F U' L B R2 U2 F' D R' B' L2 U D' F2 R U' B L",
  ];
  return bank[seed % bank.length];
}

test('keyboard shortcuts stay out of the way of focused controls and can be switched off', async ({ page }) => {
  await open(page);
  await page.locator('#random-scramble').focus();
  await page.keyboard.press('u');
  await page.keyboard.press('Shift+R');
  await settled(page);
  expect(await page.evaluate(() => window.__cubeApp.state.history)).toEqual([]);
  await page.locator('#scene').focus();
  await page.keyboard.press('u');
  await settled(page);
  expect(await page.evaluate(() => window.__cubeApp.state.history)).toEqual(['U']);
  await page.click('#solve');
  await expect(page.locator('#solution')).toBeVisible();
  // Space on a focused button activates that button, not playback.
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.locator('#copy-solution').focus();
  await page.keyboard.press(' ');
  await expect(page.locator('#copy-solution')).toHaveText('Copied');
  expect(await page.evaluate(() => window.__cubeApp.state.playing)).toBe(false);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await page.evaluate(() => window.__cubeApp.state.solution.moves.join(' ')));
  // The toggle disables letter shortcuts entirely and is remembered.
  await page.uncheck('#shortcuts');
  await page.locator('#scene').focus();
  await page.keyboard.press('r');
  await settled(page);
  expect(await page.evaluate(() => window.__cubeApp.state.history)).toEqual(['U']);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__cubeApp && window.__cubeApp.state.ready, null, { timeout: 60000 });
  expect(await page.isChecked('#shortcuts')).toBe(false);
});

test('messages are exposed as status regions and the in-page anchor is not mistaken for a scramble', async ({ page }) => {
  await open(page, '#how');
  await expect(page.locator('#scramble-message')).toBeHidden();
  await expect(page.locator('#scramble-input')).toHaveValue('');
  await page.fill('#scramble-input', 'R Q');
  await page.click('#scramble-form button[type=submit]');
  await expect(page.locator('#scramble-message')).toHaveAttribute('role', 'status');
  await expect(page.locator('#scramble-input')).toHaveAttribute('aria-invalid', 'true');
  await page.fill('#scramble-input', 'R U');
  await page.click('#scramble-form button[type=submit]');
  await settled(page);
  expect(await page.getAttribute('#scramble-input', 'aria-invalid')).toBeNull();
  await page.click('#solve');
  await expect(page.locator('#solution')).toBeVisible();
  await expect(page.locator('#announcer')).toContainText('Solution found');
  expect(await page.evaluate(() => document.activeElement && document.activeElement.id)).toBe('player-play');
});
