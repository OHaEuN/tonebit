"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { ProductCategory } from "@/types/product";
import { fitSize } from "@/features/analysis/frame";
import { track } from "@/features/analytics/track";
import { nearestSeason, SEASON_INFO } from "@/features/recommend/palettes";
import { UploadButton } from "@/features/try/UploadButton";
import { useShadeScan, type ScanMark } from "./useShadeScan";

interface ShadeScannerProps {
  category: ProductCategory;
  /** 저장한 색을 바로 발라 본다 */
  onSaved: (id: string) => void;
}

const PREVIEW_WIDTH = 480;
const STEP_TEXT = {
  photo: "흰 종이(복사지)에 제품을 진하게 한 번 칠하고, 실내 조명 아래에서 종이가 같이 나오게 찍어 올려 주세요.",
  paper: "사진에서 아무것도 안 칠한 흰 종이를 눌러 주세요.",
  swatch: "이제 칠한 곳의 가운데를 눌러 주세요.",
  done: "색을 읽었어요. 이름을 붙여 저장하면 발라 보기 칩에 '내 제품'으로 들어가요.",
} as const;

function drawMark(ctx: CanvasRenderingContext2D, mark: ScanMark, w: number, h: number, color: string) {
  ctx.beginPath();
  ctx.arc(mark.u * w, mark.v * h, Math.max(6, w * 0.025), 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.stroke();
}

/**
 * 내가 가진 립·블러셔의 실제 색 재기. 흰 종이로 나눠 조명을 지우고 색 hex만 이 브라우저에 남긴다
 */
export function ShadeScanner({ category, onSaved }: ShadeScannerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { image, step, paper, swatch, error, load, tap, repick, save } = useShadeScan();
  const [name, setName] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const { w, h } = fitSize(image.naturalWidth, image.naturalHeight, PREVIEW_WIDTH);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(image, 0, 0, w, h);
    if (paper) drawMark(ctx, paper, w, h, "#2563eb");
    if (swatch) drawMark(ctx, swatch.mark, w, h, "#ffffff");
  }, [image, paper, swatch]);

  const onDown = (e: PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    tap((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
  };

  const label = category === "lip" ? "립" : "블러셔";
  const near = swatch ? SEASON_INFO[nearestSeason(swatch.hex, category === "lip" ? "lips" : "blushes")] : null;

  return (
    <details className="rounded-2xl border border-line p-4 text-sm">
      <summary className="cursor-pointer font-medium">내가 가진 {label} 색 재기</summary>
      <div className="mt-3 space-y-3">
        <p className="text-muted">{STEP_TEXT[step]}</p>
        {image && (
          <canvas
            ref={canvasRef}
            onPointerDown={onDown}
            aria-label="흰 종이에 칠한 제품 사진. 종이와 칠한 곳을 차례로 누르세요"
            className="block h-auto max-h-72 w-auto max-w-full cursor-crosshair touch-manipulation rounded-xl"
          />
        )}
        {error && (
          <p role="alert" className="text-amber-900">
            {error}
          </p>
        )}
        {swatch && near && (
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="size-10 shrink-0 rounded-full border border-black/10" style={{ background: swatch.hex }} />
            <p>
              {swatch.hex.toUpperCase()} · {near.label} {near.tone} 팔레트에 가까운 색이에요
            </p>
          </div>
        )}
        {step === "done" && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`예: 쓰는 ${label} 이름`}
              aria-label={`${label} 이름`}
              maxLength={30}
              className="min-w-0 flex-1 rounded-full border border-line bg-bg px-4 py-2"
            />
            <button
              type="button"
              onClick={() => {
                const id = save(name, category);
                setName("");
                if (!id) return;
                track({ name: "shade-saved", kind: category });
                onSaved(id);
              }}
              className="rounded-full bg-accent px-4 py-2 font-medium text-white hover:opacity-90"
            >
              저장
            </button>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <UploadButton onFiles={([f]) => void load(f)} label={image ? "다른 사진" : "사진 올리기"} />
          {(step === "swatch" || step === "done") && (
            <button type="button" onClick={repick} className="rounded-full border border-line bg-card px-5 py-3 font-medium hover:bg-accent-soft">
              종이부터 다시 누르기
            </button>
          )}
        </div>
      </div>
    </details>
  );
}
