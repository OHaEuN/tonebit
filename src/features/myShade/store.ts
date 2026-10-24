import { create } from "zustand";
import type { ProductCategory, Swatch } from "@/types/product";
import { findSwatchById } from "@/features/recommend/palettes";

/** 이용자가 흰 종이에 발라 찍어서 잰 자기 제품 색 */
export interface MyShade extends Swatch {
  category: ProductCategory;
}

const STORAGE_KEY = "tonebit:my-shades";
/** 이름을 바꾸기 전(톤픽) 키. 있으면 한 번 읽어 새 키로 옮긴다 */
const LEGACY_KEY = "tonepick:my-shades";
/** 너무 많이 쌓이면 칩 줄이 길어진다. 넘치면 오래된 것부터 버린다 */
const MAX_SHADES = 12;

/** 색 hex와 이름만 이 브라우저에 남긴다. 사생활 모드·저장소 차단이면 이번 방문 동안만 기억한다 */
function load(): MyShade[] {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    const legacy = raw === null ? localStorage.getItem(LEGACY_KEY) : null;
    if (legacy !== null) {
      localStorage.setItem(STORAGE_KEY, legacy);
      localStorage.removeItem(LEGACY_KEY);
      raw = legacy;
    }
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isMyShade) : [];
  } catch {
    return [];
  }
}

function save(shades: MyShade[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shades));
  } catch {
    // 저장 못 해도 화면에는 남는다
  }
}

function isMyShade(v: unknown): v is MyShade {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.id === "string" &&
    s.id.startsWith("mine-") &&
    typeof s.name === "string" &&
    typeof s.hex === "string" &&
    /^#[0-9a-f]{6}$/i.test(s.hex) &&
    (s.category === "lip" || s.category === "blush")
  );
}

interface MyShadeState {
  shades: MyShade[];
  loaded: boolean;
  /** 브라우저에서만 부른다(SSR에는 localStorage가 없다) */
  hydrate: () => void;
  add: (shade: Omit<MyShade, "id">) => string;
  remove: (id: string) => void;
}

export const useMyShadeStore = create<MyShadeState>((set, get) => ({
  shades: [],
  loaded: false,
  hydrate: () => {
    if (get().loaded) return;
    set({ shades: load(), loaded: true });
  },
  add: (shade) => {
    const id = `mine-${Date.now().toString(36)}`;
    const shades = [...get().shades, { ...shade, id }].slice(-MAX_SHADES);
    save(shades);
    set({ shades });
    return id;
  },
  remove: (id) => {
    const shades = get().shades.filter((s) => s.id !== id);
    save(shades);
    set({ shades });
  },
}));

/** 칩 id의 색. 내 제품을 먼저 찾고 없으면 팔레트·제품에서 찾는다 */
export function resolveSwatch(kind: "lips" | "blushes", id: string | null): Swatch | null {
  if (!id) return null;
  return useMyShadeStore.getState().shades.find((s) => s.id === id) ?? findSwatchById(kind, id);
}

export function resolveSwatchHex(kind: "lips" | "blushes", id: string | null): string | null {
  return resolveSwatch(kind, id)?.hex ?? null;
}
