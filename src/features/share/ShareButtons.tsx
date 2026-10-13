"use client";

import { useState } from "react";
import type { ToneSlug } from "@/types/analysis";
import { cardImagePath } from "./resultUrl";

interface ShareButtonsProps {
  tone: ToneSlug;
  title: string;
}

export function ShareButtons({ tone, title }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text: `${title} · 톤픽 컬러 테스트`, url });
      } catch {
        // 사용자가 공유 시트를 닫은 경우. 아무것도 안 한다
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={share}
        data-umami-event="share"
        className="rounded-full bg-accent px-5 py-3 font-medium text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        결과 공유하기
      </button>
      <a
        href={cardImagePath(tone)}
        download={`tonepick-${tone}.png`}
        data-umami-event="card-download"
        className="rounded-full border border-line bg-card px-5 py-3 font-medium hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        카드 이미지 저장
      </a>
      <span role="status" aria-live="polite" className="text-sm text-muted">
        {copied && "링크를 복사했어요"}
      </span>
    </div>
  );
}
