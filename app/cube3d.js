/**
 * A 3D cube drawn with CSS transforms: 26 cubies, each with six faces.
 *
 * The cube lives in CSS's coordinate system (x right, y down, z toward the
 * viewer). Cubie (x, y, z) with each coordinate in {-1, 0, 1}: x = 1 is the
 * R layer, y = -1 the U layer, z = 1 the F layer. Colours come from the 54
 * sticker array of the model (see src/cube.js for the net layout); the map
 * from a cubie face to a sticker index is FACE_STICKER below.
 *
 * Animating a turn rotates the cubies of the affected layer(s) with an extra
 * rotate3d(); when the turn finishes the model is updated and every cubie is
 * repainted in its base position, which is visually seamless because the
 * repainted colours are exactly where the rotated stickers ended up.
 */

import { normalizeMove } from '../src/cube.js';

const FACE_INDEX = { L: 0, F: 1, R: 2, B: 3, U: 4, D: 5 };

/** Which sticker a cubie face shows: (x, y, z) → index into the 54 stickers. */
const FACE_STICKER = {
  U: (x, y, z) => FACE_INDEX.U * 9 + (z + 1) * 3 + (x + 1),
  D: (x, y, z) => FACE_INDEX.D * 9 + (1 - z) * 3 + (x + 1),
  F: (x, y, z) => FACE_INDEX.F * 9 + (y + 1) * 3 + (x + 1),
  B: (x, y, z) => FACE_INDEX.B * 9 + (y + 1) * 3 + (1 - x),
  R: (x, y, z) => FACE_INDEX.R * 9 + (y + 1) * 3 + (1 - z),
  L: (x, y, z) => FACE_INDEX.L * 9 + (y + 1) * 3 + (z + 1),
};

/** The face of a cubie that is on the outside, per axis value. */
const OUTSIDE = {
  U: (x, y) => y === -1,
  D: (x, y) => y === 1,
  F: (x, y, z) => z === 1,
  B: (x, y, z) => z === -1,
  R: (x) => x === 1,
  L: (x) => x === -1,
};

/**
 * How each basic turn rotates: axis, which layer coordinates move, and the
 * signed angle of one clockwise quarter turn in CSS's rotation convention
 * (worked out from where a front-top sticker has to end up).
 */
const TURNS = {
  U: { axis: 'y', layers: [-1], angle: -90 },
  D: { axis: 'y', layers: [1], angle: 90 },
  R: { axis: 'x', layers: [1], angle: 90 },
  L: { axis: 'x', layers: [-1], angle: -90 },
  F: { axis: 'z', layers: [1], angle: 90 },
  B: { axis: 'z', layers: [-1], angle: -90 },
  M: { axis: 'x', layers: [0], angle: -90 },
  E: { axis: 'y', layers: [0], angle: 90 },
  S: { axis: 'z', layers: [0], angle: 90 },
  x: { axis: 'x', layers: [-1, 0, 1], angle: 90 },
  y: { axis: 'y', layers: [-1, 0, 1], angle: -90 },
  z: { axis: 'z', layers: [-1, 0, 1], angle: 90 },
  Uw: { axis: 'y', layers: [-1, 0], angle: -90 },
  Dw: { axis: 'y', layers: [0, 1], angle: 90 },
  Rw: { axis: 'x', layers: [0, 1], angle: 90 },
  Lw: { axis: 'x', layers: [-1, 0], angle: -90 },
  Fw: { axis: 'z', layers: [0, 1], angle: 90 },
  Bw: { axis: 'z', layers: [-1, 0], angle: -90 },
};

/** Describe the rotation a move name performs, or null for unknown moves. */
export function turnGeometry(move) {
  const name = normalizeMove(move);
  if (!name) return null;
  const base = name.replace(/['2]$/, '');
  const spec = TURNS[base];
  if (!spec) return null;
  const factor = name.endsWith('2') ? 2 : name.endsWith("'") ? -1 : 1;
  return { axis: spec.axis, layers: spec.layers, angle: spec.angle * factor };
}

const AXIS_VECTOR = { x: '1, 0, 0', y: '0, 1, 0', z: '0, 0, 1' };

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export class Cube3D {
  /**
   * @param {HTMLElement} scene the element to draw into (position: relative)
   */
  constructor(scene) {
    this.scene = scene;
    this.cube = document.createElement('div');
    this.cube.className = 'cube';
    this.scene.appendChild(this.cube);
    this.cubies = [];
    this.size = 60;
    this.rx = -28;
    this.ry = -38;
    this.animation = null;
    this.stickers = new Uint8Array(54);
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue;
          const el = document.createElement('div');
          el.className = 'cubie';
          const faces = {};
          for (const f of ['U', 'D', 'F', 'B', 'R', 'L']) {
            const face = document.createElement('div');
            const outside = OUTSIDE[f](x, y, z);
            face.className = `face face-${f.toLowerCase()}${outside ? '' : ' inner'}`;
            el.appendChild(face);
            if (outside) faces[f] = face;
          }
          this.cube.appendChild(el);
          this.cubies.push({ x, y, z, el, faces });
        }
      }
    }
    this.setSize(this.size);
    this.setOrientation(this.rx, this.ry);
    this.enableDrag();
  }

  /** Cubie edge length in pixels. */
  setSize(px) {
    this.size = px;
    this.scene.style.setProperty('--cubie', `${px}px`);
    for (const c of this.cubies) c.el.style.transform = this.baseTransform(c);
  }

  baseTransform(c) {
    const s = this.size;
    return `translate3d(${c.x * s}px, ${c.y * s}px, ${c.z * s}px)`;
  }

  /** Whole-cube orientation in degrees. */
  setOrientation(rx, ry) {
    this.rx = Math.max(-90, Math.min(90, rx));
    this.ry = ((ry + 180) % 360 + 360) % 360 - 180;
    this.cube.style.transform = `rotateX(${this.rx}deg) rotateY(${this.ry}deg)`;
  }

  /** Paint the cube from a 54-sticker array (values 0-5, or 6 for blank). */
  setStickers(stickers) {
    this.stickers = Uint8Array.from(stickers);
    for (const c of this.cubies) {
      for (const [f, face] of Object.entries(c.faces)) {
        const colour = this.stickers[FACE_STICKER[f](c.x, c.y, c.z)];
        face.className = `face face-${f.toLowerCase()} c${colour}`;
      }
    }
  }

  /** Sticker index shown by the given cubie face (for hit testing, tests). */
  static stickerFor(face, x, y, z) {
    return FACE_STICKER[face](x, y, z);
  }

  /**
   * Animate one move. Resolves when done. The caller is expected to update
   * the model and call setStickers() in the `onComplete` callback, which runs
   * synchronously before the rotated transforms are reset, so the frame
   * that ends the animation already shows the repainted cube.
   */
  animateMove(move, durationMs, onComplete) {
    const geo = turnGeometry(move);
    if (!geo) return Promise.reject(new Error(`Unknown move "${move}"`));
    if (this.animation) this.finishAnimation();
    const moving = this.cubies.filter((c) => geo.layers.includes(c[geo.axis]));
    const axis = AXIS_VECTOR[geo.axis];
    const apply = (angle) => {
      for (const c of moving) c.el.style.transform = `rotate3d(${axis}, ${angle}deg) ${this.baseTransform(c)}`;
    };
    return new Promise((resolve) => {
      const finish = () => {
        this.animation = null;
        if (onComplete) onComplete();
        for (const c of moving) c.el.style.transform = this.baseTransform(c);
        resolve();
      };
      if (!(durationMs > 0)) {
        finish();
        return;
      }
      const start = performance.now();
      const frame = (now) => {
        if (this.animation !== anim) return;
        const t = Math.min(1, (now - start) / durationMs);
        apply(geo.angle * easeInOut(t));
        if (t < 1) anim.raf = requestAnimationFrame(frame);
        else finish();
      };
      const anim = { finish, raf: 0 };
      this.animation = anim;
      anim.raf = requestAnimationFrame(frame);
    });
  }

  /** Jump the running animation (if any) to its end. */
  finishAnimation() {
    const anim = this.animation;
    if (!anim) return;
    cancelAnimationFrame(anim.raf);
    this.animation = null;
    anim.finish();
  }

  enableDrag() {
    let dragging = null;
    const scene = this.scene;
    const down = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      dragging = { x: e.clientX, y: e.clientY, rx: this.rx, ry: this.ry, moved: false };
      scene.setPointerCapture?.(e.pointerId);
      scene.classList.add('dragging');
    };
    const move = (e) => {
      if (!dragging) return;
      const dx = e.clientX - dragging.x;
      const dy = e.clientY - dragging.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) dragging.moved = true;
      this.setOrientation(dragging.rx - dy * 0.5, dragging.ry + dx * 0.5);
    };
    const up = (e) => {
      if (!dragging) return;
      scene.releasePointerCapture?.(e.pointerId);
      scene.classList.remove('dragging');
      dragging = null;
    };
    scene.addEventListener('pointerdown', down);
    scene.addEventListener('pointermove', move);
    scene.addEventListener('pointerup', up);
    scene.addEventListener('pointercancel', up);
    scene.addEventListener('lostpointercapture', up);
  }
}
