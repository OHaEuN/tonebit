"use client";

import { useEffect, useRef } from "react";
import { renderSmear, type SmearBitmap, type SmearFinish, type SmearShape } from "./smear";

interface SmearProps {
  color: string;
  shape?: SmearShape;
  finish?: SmearFinish;
  /** CSS 픽셀 크기 */
  width: number;
  height: number;
  seed?: number;
  className?: string;
  label?: string;
  /** true면 width·height는 그리는 해상도와 비율만 정하고, 화면에서는 부모 폭에 맞춰 늘어난다 */
  fluid?: boolean;
  /** 화면 밀도 상한. 큰 자국은 1.5 정도로 낮춰 계산을 줄인다 */
  maxDpr?: number;
}

/** 같은 색·모양은 한 번만 계산한다. 칩 줄은 같은 색을 여러 번 그린다 */
const cache = new Map<string, SmearBitmap>();
const MAX_CACHE = 160;

function bitmapFor(key: string, make: () => SmearBitmap): SmearBitmap {
  const hit = cache.get(key);
  if (hit) return hit;
  const made = make();
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value!);
  cache.set(key, made);
  return made;
}

/** 크림을 바른 듯한 발색 자국. 캔버스에 직접 그린다 */
export function SwatchSmear({ color, shape = "dab", finish = "cream", width, height, seed = 7, className = "", label, fluid = false, maxDpr = 2 }: SmearProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
    const w = Math.round(width * dpr);
    const h = Math.round(height * dpr);
    const bmp = bitmapFor(`${shape}|${finish}|${color}|${w}x${h}|${seed}`, () => renderSmear({ width: w, height: h, color, shape, finish, seed }));
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")?.putImageData(new ImageData(new Uint8ClampedArray(bmp.data), w, h), 0, 0);
  }, [color, shape, finish, width, height, seed, maxDpr]);

  return (
    <canvas
      ref={ref}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={className}
      style={fluid ? { width: "100%", height: "auto", aspectRatio: `${width} / ${height}` } : { width, height }}
    />
  );
}
