"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type PointerEvent, type ReactNode, type RefObject, type WheelEvent } from "react";
import { useAnalysisStore } from "@/stores/analysisStore";
import { clampView, containSize, fitView, frameBox, toggleZoom, zoomAt, type Box, type View } from "./zoom";

interface PhotoViewerProps {
  /** 그림이 그려지는 원래 캔버스. render가 없으면 열려 있는 동안 매 프레임 옮겨 그린다(카메라 실시간) */
  sourceRef: RefObject<HTMLCanvasElement | null>;
  /** 정지 사진: 확대해도 선명하게 이 캔버스에 직접 크게 그린다. 바뀌면(색을 고르면) 다시 그린다 */
  render?: ((canvas: HTMLCanvasElement, maxWidth: number) => void) | null;
  /** 전면 카메라처럼 좌우 반전해서 보여 줄지 */
  mirrored: boolean;
  onClose: () => void;
  /** 처음 열 때 이 상자(정규화 좌표, 보통 얼굴)를 크게 잡는다. 없으면 사진 전체 */
  focus?: { minX: number; maxX: number; minY: number; maxY: number } | null;
  /** 아래쪽 패널(색 바꾸기) */
  children?: ReactNode;
}

const TAP_SLOP = 10;
/** 크게 보기에서 정지 사진을 그릴 최대 폭. 폰 화면(약 400pt × 3배)을 2~3배 확대해도 선명한 정도 */
const MAX_VIEWER_WIDTH = 2048;
const DOUBLE_TAP_MS = 300;

/**
 * 사진을 화면 가득 띄우고 두 손가락으로 확대·이동, 두 번 탭해 확대한다.
 * 아래 패널에서 색을 바꾸면 원래 캔버스가 다시 그려지고 그대로 따라온다
 */
export function PhotoViewer({ sourceRef, render, mirrored, focus, onClose, children }: PhotoViewerProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const setComparing = useAnalysisStore((s) => s.setComparing);
  const [viewport, setViewport] = useState<Box>({ w: 0, h: 0 });
  const [img, setImg] = useState<Box>({ w: 0, h: 0 });
  const base = img.w && viewport.w ? containSize(img, viewport) : { w: 0, h: 0 };
  // 확대 상태는 지금 크기(뷰포트·사진)에 묶어 둔다. 크기가 바뀌면(처음 열 때·회전) 저절로 맞춤으로 돌아간다
  const sizeKey = `${viewport.w}x${viewport.h}:${img.w}x${img.h}`;
  const [zoomState, setZoomState] = useState<{ key: string; view: View } | null>(null);
  const view = zoomState?.key === sizeKey ? zoomState.view : focus && base.w ? frameBox(focus, base, viewport) : fitView(base, viewport);
  const setView = (v: View) => setZoomState({ key: sizeKey, view: v });

  // 정지 사진은 원본 해상도로 직접 그리고, 카메라는 원래 캔버스를 매 프레임 옮겨 그린다
  useEffect(() => {
    const dst = canvasRef.current;
    if (!dst) return;
    if (render) {
      render(dst, MAX_VIEWER_WIDTH);
      setImg((prev) => (prev.w === dst.width && prev.h === dst.height ? prev : { w: dst.width, h: dst.height }));
      return;
    }
    let raf = 0;
    const tick = () => {
      const src = sourceRef.current;
      if (src && src.width && src.height) {
        if (dst.width !== src.width || dst.height !== src.height) {
          dst.width = src.width;
          dst.height = src.height;
          setImg({ w: src.width, h: src.height });
        }
        dst.getContext("2d")?.drawImage(src, 0, 0);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [sourceRef, render]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    // 처음 observe할 때도 한 번 불린다
    const ro = new ResizeObserver(() => setViewport({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 열려 있는 동안 뒤 페이지 스크롤을 막고, Esc로 닫는다
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      setComparing(false);
    };
  }, [onClose, setComparing]);

  // ---- 제스처 ----
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ view: View; dist: number; mid: { x: number; y: number }; moved: boolean; start: { x: number; y: number } } | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);

  const local = (e: { clientX: number; clientY: number }) => {
    const r = stageRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const snapshot = (moved = false) => {
    const pts = [...pointers.current.values()];
    const mid = pts.length === 2 ? { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 } : pts[0];
    const dist = pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0;
    gesture.current = { view, dist, mid, moved, start: gesture.current?.start ?? mid };
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, local(e));
    gesture.current = null;
    snapshot(pointers.current.size > 1);
  };

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, local(e));
    const g = gesture.current;
    const pts = [...pointers.current.values()];
    if (pts.length === 2 && g.dist > 0) {
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const zoomed = zoomAt(g.view, g.view.scale * (dist / g.dist), g.mid, base, viewport);
      setView(clampView({ ...zoomed, x: zoomed.x + mid.x - g.mid.x, y: zoomed.y + mid.y - g.mid.y }, base, viewport));
      g.moved = true;
    } else if (pts.length === 1) {
      const p = pts[0];
      if (Math.hypot(p.x - g.start.x, p.y - g.start.y) > TAP_SLOP) g.moved = true;
      if (g.moved) setView(clampView({ ...g.view, x: g.view.x + p.x - g.mid.x, y: g.view.y + p.y - g.mid.y }, base, viewport));
    }
  };

  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const p = pointers.current.get(e.pointerId);
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (pointers.current.size > 0) {
      // 두 손가락 중 하나를 떼면 남은 손가락으로 이어서 이동
      gesture.current = null;
      snapshot(true);
      return;
    }
    gesture.current = null;
    if (!p || !g || g.moved) return;
    const now = performance.now();
    const last = lastTap.current;
    if (last && now - last.t < DOUBLE_TAP_MS && Math.hypot(p.x - last.x, p.y - last.y) < TAP_SLOP * 3) {
      setView(toggleZoom(view, p, base, viewport));
      lastTap.current = null;
    } else {
      lastTap.current = { t: now, x: p.x, y: p.y };
    }
  };

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    setView(zoomAt(view, view.scale * Math.exp(-e.deltaY * 0.0015), local(e), base, viewport));
  };

  const zoomed = view.scale > 1.01;

  // 결과 화면의 여백·고정 레이아웃에 영향받지 않게 body 바로 아래에 띄운다
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="사진 크게 보기" className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <div className="flex items-center justify-between gap-2 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="flex size-10 items-center justify-center rounded-full bg-white/10 text-xl leading-none hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
          aria-label="닫기"
        >
          ×
        </button>
        <p className="text-xs text-white/70">{zoomed ? `${view.scale.toFixed(1)}배 · 두 번 탭하면 원래 크기` : "두 손가락으로 확대 · 두 번 탭"}</p>
        <button
          type="button"
          onPointerDown={() => setComparing(true)}
          onPointerUp={() => setComparing(false)}
          onPointerLeave={() => setComparing(false)}
          onPointerCancel={() => setComparing(false)}
          onKeyDown={(e) => (e.key === " " || e.key === "Enter") && setComparing(true)}
          onKeyUp={() => setComparing(false)}
          onContextMenu={(e) => e.preventDefault()}
          className="select-none rounded-full bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
        >
          꾹: 바르기 전
        </button>
      </div>

      <div
        ref={stageRef}
        data-testid="photo-viewer-stage"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onWheel={onWheel}
        className="relative min-h-0 flex-1 touch-none select-none overflow-hidden"
      >
        <div className="absolute top-0 left-0 origin-top-left" style={{ width: base.w, height: base.h, transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>
          <canvas ref={canvasRef} className={`block h-full w-full ${mirrored ? "-scale-x-100" : ""}`} />
        </div>
      </div>

      {children && <div className="max-h-[45svh] overflow-y-auto rounded-t-3xl bg-bg px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] text-fg">{children}</div>}
    </div>,
    document.body,
  );
}
