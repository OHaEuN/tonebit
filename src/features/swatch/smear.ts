import type { Finish } from "@/types/product";
import { hexToRgb, linearize } from "@/features/analysis/color";

/** swipe: 손등에 쓱 바른 자국(두꺼운 몸통 + 마른 붓결 꼬리 + 튄 방울), dab: 동그랗게 찍은 발색 */
export type SmearShape = "swipe" | "dab";
/** 광택. 글로시는 또렷한 하이라이트, 크림은 부드러운 윤기, 매트는 거의 없음 */
export type SmearFinish = "gloss" | "cream" | "matte";

/** 칩마다 모양이 조금씩 다르게 id로 seed를 만든다 */
export function seedOf(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** 제품 제형 → 발색 광택 */
export function smearFinish(finish?: Finish): SmearFinish {
  if (finish === "glossy") return "gloss";
  if (finish === "matte" || finish === "velvet" || finish === "powder") return "matte";
  return "cream";
}

export interface SmearOptions {
  width: number;
  height: number;
  color: string;
  shape: SmearShape;
  finish: SmearFinish;
  /** 같은 seed면 같은 모양 */
  seed: number;
}

export interface SmearBitmap {
  width: number;
  height: number;
  /** RGBA, 바깥은 투명 */
  data: Uint8ClampedArray;
}

/** 결정적 난수(mulberry32) */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 1차원 값 노이즈(0~1). 붓결 줄무늬와 가장자리 들쭉날쭉함에 쓴다 */
function valueNoise(rand: () => number, size = 256): (x: number) => number {
  const table = Array.from({ length: size }, rand);
  return (x: number) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = table[((i % size) + size) % size];
    const b = table[(((i + 1) % size) + size) % size];
    const s = f * f * (3 - 2 * f);
    return a + (b - a) * s;
  };
}

/** 2차원 값 노이즈(0~1). cell 픽셀마다 난수를 두고 부드럽게 잇는다. 크림 표면의 완만한 울퉁불퉁함 */
function valueNoise2(rand: () => number, cell: number): (x: number, y: number) => number {
  const n = 64;
  const table = Array.from({ length: n * n }, rand);
  const at = (i: number, j: number) => table[(((j % n) + n) % n) * n + (((i % n) + n) % n)];
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const fx = x / cell;
    const fy = y / cell;
    const i = Math.floor(fx);
    const j = Math.floor(fy);
    const u = smooth(fx - i);
    const v = smooth(fy - j);
    const top = at(i, j) + (at(i + 1, j) - at(i, j)) * u;
    const bottom = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * u;
    return top + (bottom - top) * v;
  };
}

/** 두께 지도와 덮임(알파)을 함께 그린다. 같은 자리는 큰 값을 남긴다 */
class Field {
  readonly height: Float32Array;
  readonly cover: Float32Array;
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.height = new Float32Array(w * h);
    this.cover = new Float32Array(w * h);
  }

  /** 둥근 끝 선분(캡슐). 가장자리는 1px 안티에일리어싱 */
  capsule(ax: number, ay: number, bx: number, by: number, r: number, thick: number) {
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - r - 1));
    const x1 = Math.min(this.w - 1, Math.ceil(Math.max(ax, bx) + r + 1));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by) - r - 1));
    const y1 = Math.min(this.h - 1, Math.ceil(Math.max(ay, by) + r + 1));
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy || 1;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const t = Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / len2));
        const d = Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
        const c = Math.min(1, Math.max(0, r - d + 0.5));
        if (c <= 0) continue;
        const i = y * this.w + x;
        if (c > this.cover[i]) this.cover[i] = c;
        const v = c * thick;
        if (v > this.height[i]) this.height[i] = v;
      }
    }
  }
}

/** 분리형 박스 블러를 세 번(가우시안 근사). 두께를 둥근 돔으로 만든다 */
function blur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  // 원본(두께)은 얇은 곳을 가르는 데 다시 쓰므로 복사본에서 흐린다
  const a = new Float32Array(src);
  const b = new Float32Array(src.length);
  const pass = (from: Float32Array, to: Float32Array, horizontal: boolean) => {
    const n = horizontal ? w : h;
    const lines = horizontal ? h : w;
    for (let line = 0; line < lines; line++) {
      const at = (k: number) => (horizontal ? line * w + k : k * w + line);
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += from[at(Math.min(n - 1, Math.max(0, k)))];
      for (let k = 0; k < n; k++) {
        to[at(k)] = sum / (2 * r + 1);
        sum += from[at(Math.min(n - 1, k + r + 1))] - from[at(Math.max(0, k - r))];
      }
    }
  };
  for (let i = 0; i < 3; i++) {
    pass(a, b, true);
    pass(b, a, false);
  }
  return a;
}

function drawSwipe(f: Field, rand: () => number) {
  const { w, h } = f;
  const noise = valueNoise(rand);
  const cy = h * (0.46 + (rand() - 0.5) * 0.08);
  const R = h * 0.3;
  const x0 = w * 0.1 + R * 0.3;
  const x1 = w * 0.6;
  const bend = (rand() - 0.5) * h * 0.12;
  const steps = 48;
  const at = (t: number) => ({ x: x0 + (x1 - x0) * t, y: cy + bend * Math.sin(Math.PI * t) });
  // 몸통: 왼쪽 끝이 가장 두껍고 오른쪽으로 가늘어진다. 반지름에 노이즈를 섞어 가장자리를 손으로 바른 듯 울퉁불퉁하게
  for (let s = 0; s < steps; s++) {
    const t = s / steps;
    const p = at(t);
    const q = at((s + 1) / steps);
    const r = R * (1 - 0.32 * t) * (0.94 + 0.12 * noise(t * 9));
    f.capsule(p.x, p.y, q.x, q.y, r, 1);
  }
  // 찢어지는 꼬리: 몸통 끝에서 크림이 가닥으로 끌려 나가다 끊긴다. 가닥마다 굵기가 줄며 군데군데 끊긴다
  const unit = h / 280;
  const strands = 46;
  for (let k = 0; k < strands; k++) {
    const u = rand() * 2 - 1;
    const start = at(0.84 + rand() * 0.16);
    const y0 = start.y + u * R * 0.78;
    let x = start.x - R * (0.15 + rand() * 0.3);
    const reach = w * (0.05 + Math.pow(rand(), 1.4) * 0.26) * (1 - Math.abs(u) * 0.45);
    const end = Math.min(w - 6, x + reach);
    const slope = (rand() - 0.5) * 0.1;
    const r0 = (1.2 + Math.pow(rand(), 1.5) * 5.5) * unit;
    const sx = x;
    while (x < end) {
      const seg = (8 + rand() * 34) * unit;
      const nx = Math.min(end, x + seg);
      const fade = 1 - (x - sx) / (reach + 1);
      f.capsule(x, y0 + slope * (x - sx), nx, y0 + slope * (nx - sx), Math.max(0.6, r0 * fade), 0.4 + 0.3 * fade);
      x = nx + (rand() < 0.4 ? (3 + rand() * 12) * unit : 0);
    }
  }
  // 튄 방울: 꼬리 끝 근처의 작은 점
  for (let k = 0; k < 22; k++) {
    const x = w * (0.64 + rand() * 0.3);
    const y = cy + (rand() * 2 - 1) * R * 0.95;
    const r = (0.8 + Math.pow(rand(), 2.2) * 4.5) * unit;
    f.capsule(x, y, x + rand() * 3 * unit, y + (rand() - 0.5) * 2 * unit, r, 0.55);
  }
}

function drawDab(f: Field, rand: () => number) {
  const { w, h } = f;
  const noise = valueNoise(rand);
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) * 0.47;
  // 살짝 찌그러진 원: 둘레를 따라 반지름을 흔든 부채꼴들을 겹친다
  const n = 64;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const r = R * (0.93 + 0.07 * noise(k * 0.35));
    f.capsule(cx, cy, cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.47, 1);
  }
}

const FINISH = {
  gloss: { ks: 0.85, shin: 60, bump: 16 },
  cream: { ks: 0.3, shin: 16, bump: 14 },
  matte: { ks: 0.06, shin: 8, bump: 12 },
} as const;

/** 빛 방향: 왼쪽 위 */
const LIGHT = (() => {
  const l = [-0.45, -0.6, 0.66];
  const n = Math.hypot(...l);
  return l.map((v) => v / n);
})();
const HALF = (() => {
  const v = [LIGHT[0], LIGHT[1], LIGHT[2] + 1];
  const n = Math.hypot(...v);
  return v.map((x) => x / n);
})();
/** 평평한 곳이 원래 색 그대로 나오게 확산광을 맞춘다 */
const KD = 0.6;
const AMBIENT = 1 - KD * LIGHT[2];

const encode = (v: number) => Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.min(1, v), 1 / 2.4) - 0.055));

/**
 * 크림·립 발색 자국을 그린다. 모양을 두께 지도로 만들고 흐려서 둥근 돔을 만든 뒤, 붓결 줄무늬를 더하고
 * 두께의 기울기로 법선을 구해 확산광·광택을 계산한다. 얇은 붓결은 바탕이 비쳐 색이 옅어진다
 */
export function renderSmear({ width, height, color, shape, finish, seed }: SmearOptions): SmearBitmap {
  const rand = random(seed);
  const f = new Field(width, height);
  if (shape === "swipe") drawSwipe(f, rand);
  else drawDab(f, rand);

  const scale = Math.max(1, Math.round(Math.min(width, height) / 70));
  const dome = blur(f.height, width, height, scale * 3);
  const groove = valueNoise(rand, 512);
  const bumps = valueNoise2(rand, 18 * scale);
  const { ks, shin, bump } = FINISH[finish];
  const flatSpec = Math.pow(HALF[2], shin);
  const [r8, g8, b8] = hexToRgb(color);
  const base = [linearize(r8), linearize(g8), linearize(b8)];
  const data = new Uint8ClampedArray(width * height * 4);

  // 두께 = 가장자리가 둥글게 솟은 평평한 크림(돔을 눌러 평평하게) + 바른 방향의 완만한 홈 + 낮은 울퉁불퉁함
  const thick = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const c = f.cover[i];
      if (!c) continue;
      const d = Math.min(1, dome[i] / 0.7);
      const plateau = d * d * (3 - 2 * d);
      const lines = shape === "swipe" ? 0.012 * groove(y / (5 * scale) + groove(x / (90 * scale)) * 3) : 0;
      thick[i] = (plateau + lines + 0.03 * bumps(x, y)) * c;
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const c = f.cover[i];
      if (!c) continue;
      const hx = thick[y * width + Math.min(width - 1, x + 1)] - thick[y * width + Math.max(0, x - 1)];
      const hy = thick[Math.min(height - 1, y + 1) * width + x] - thick[Math.max(0, y - 1) * width + x];
      let nx = -hx * bump;
      let ny = -hy * bump;
      let nz = 1;
      const nl = Math.hypot(nx, ny, nz);
      nx /= nl;
      ny /= nl;
      nz /= nl;
      const diffuse = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
      // 평평한 면의 광택은 빼서 칩 색이 제품 색 그대로 보이게 하고, 굴곡진 곳에만 하이라이트를 남긴다
      const spec = (ks * Math.max(0, Math.pow(Math.max(0, nx * HALF[0] + ny * HALF[1] + nz * HALF[2]), shin) - flatSpec)) / (1 - flatSpec);
      // 얇은 곳은 바탕(흰 종이)이 비쳐 옅어진다
      const sheer = 1 - Math.min(1, f.height[i] / 0.55);
      const o = i * 4;
      for (let k = 0; k < 3; k++) {
        const tinted = base[k] + (1 - base[k]) * 0.35 * sheer;
        data[o + k] = encode(tinted * (AMBIENT + KD * diffuse) + spec);
      }
      data[o + 3] = Math.round(255 * c);
    }
  }
  return { width, height, data };
}
