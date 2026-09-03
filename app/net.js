/**
 * The unfolded cube (net) as a grid of 54 buttons. Doubles as the read-only
 * 2D view of the cube and, in paint mode, as the editor for entering a real
 * cube's colours.
 */

const FACE_INDEX = { L: 0, F: 1, R: 2, B: 3, U: 4, D: 5 };
/** Net layout in a 4-wide by 3-high grid of faces. */
const LAYOUT = [
  { face: 'U', col: 2, row: 1 },
  { face: 'L', col: 1, row: 2 },
  { face: 'F', col: 2, row: 2 },
  { face: 'R', col: 3, row: 2 },
  { face: 'B', col: 4, row: 2 },
  { face: 'D', col: 2, row: 3 },
];
const FACE_LABEL = { U: 'Up', D: 'Down', F: 'Front', B: 'Back', L: 'Left', R: 'Right' };
const COLOUR_NAMES = ['orange', 'blue', 'red', 'green', 'yellow', 'white', 'blank'];

export class Net {
  /**
   * @param {HTMLElement} root element to fill
   * @param {(index: number) => void} onPaint called with a sticker index when a sticker is clicked in paint mode
   */
  constructor(root, onPaint) {
    this.root = root;
    this.onPaint = onPaint;
    this.buttons = new Array(54);
    this.painting = false;
    root.classList.add('net');
    for (const { face, col, row } of LAYOUT) {
      const f = FACE_INDEX[face];
      const grid = document.createElement('div');
      grid.className = `net-face net-face-${face.toLowerCase()}`;
      grid.style.gridColumn = String(col);
      grid.style.gridRow = String(row);
      grid.setAttribute('role', 'group');
      grid.setAttribute('aria-label', `${FACE_LABEL[face]} face`);
      for (let i = 0; i < 9; i++) {
        const index = f * 9 + i;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sticker';
        btn.dataset.index = String(index);
        btn.disabled = true;
        if (i === 4) {
          btn.classList.add('centre');
          btn.textContent = face;
        }
        btn.addEventListener('click', () => {
          if (this.painting && i !== 4) this.onPaint(index);
        });
        grid.appendChild(btn);
        this.buttons[index] = btn;
      }
      root.appendChild(grid);
    }
  }

  setStickers(stickers) {
    for (let i = 0; i < 54; i++) {
      const btn = this.buttons[i];
      const colour = stickers[i];
      btn.className = `sticker${i % 9 === 4 ? ' centre' : ''} c${colour}`;
      const face = 'LFRBUD'[(i / 9) | 0];
      btn.setAttribute('aria-label', `${FACE_LABEL[face]} face sticker ${(i % 9) + 1}, ${COLOUR_NAMES[colour] || 'unknown'}`);
    }
  }

  setPainting(on) {
    this.painting = on;
    this.root.classList.toggle('painting', on);
    for (let i = 0; i < 54; i++) this.buttons[i].disabled = !on || i % 9 === 4;
  }
}
