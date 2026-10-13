"use client";

import { useEffect, useState } from "react";

export interface DrapeSeason {
  key: string;
  label: string;
  accent: string;
  lip: string;
  blush: string;
  /** 드레이프 천 그라데이션 */
  drape: string;
}

interface DrapeHeroProps {
  seasons: DrapeSeason[];
}

/** 드레이프 각도. 가운데 두 장이 안쪽, 바깥 두 장이 바깥쪽 */
const ANGLES = [-21, -7, 7, 21];
const CYCLE_MS = 2400;

const SKIN = "#F2D5C0";
const SKIN_SHADE = "#E6BFA6";
const HAIR = "#2A2221";
const LINE = "#3A2C29";

/**
 * 랜딩 히어로. 퍼스널 컬러 진단처럼 시즌 드레이프를 펼치고, 그 앞의 얼굴에 시즌별 립·블러셔를 차례로 얹는다.
 * 시즌 이름을 누르면 그 시즌으로 멈춘다. 동작 줄이기 설정이면 자동으로 넘기지 않는다
 */
export function DrapeHero({ seasons }: DrapeHeroProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setActive((i) => (i + 1) % seasons.length), CYCLE_MS);
    return () => clearInterval(id);
  }, [paused, seasons.length]);

  const current = seasons[active];

  return (
    <figure className="mt-14" aria-label="퍼스널 컬러 드레이프 앞에서 시즌별 립과 블러셔를 바꿔 보는 얼굴 그림">
      <div className="relative mx-auto h-72 w-full max-w-sm">
        {seasons.map((s, i) => (
          <div
            key={s.key}
            className="drape absolute bottom-10 left-1/2 h-56 w-[88px] origin-bottom -translate-x-1/2 rounded-t-[44px] shadow-[0_18px_40px_-24px_rgba(23,19,17,0.5)] transition-opacity duration-500"
            style={{
              ["--angle" as string]: `${ANGLES[i]}deg`,
              ["--delay" as string]: `${i * 70}ms`,
              background: s.drape,
              opacity: i === active ? 1 : 0.55,
            }}
          />
        ))}
        <Face lip={current.lip} blush={current.blush} />
      </div>
      <figcaption className="mt-5 flex justify-center gap-2">
        {seasons.map((s, i) => (
          <button
            key={s.key}
            type="button"
            aria-pressed={i === active}
            onClick={() => {
              setActive(i);
              setPaused(true);
            }}
            className="rounded-full px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            style={i === active ? { background: s.accent, color: "#fff" } : { color: s.accent }}
          >
            {s.label}
          </button>
        ))}
      </figcaption>
    </figure>
  );
}

/** 단발에 시스루 뱅, 속쌍꺼풀 눈매의 동아시아인 얼굴. 립·블러셔만 바뀐다 */
function Face({ lip, blush }: { lip: string; blush: string }) {
  return (
    <svg viewBox="0 0 200 250" aria-hidden="true" className="absolute bottom-0 left-1/2 h-64 -translate-x-1/2 drop-shadow-[0_16px_24px_rgba(23,19,17,0.18)]">
      <defs>
        <radialGradient id="hero-blush">
          <stop offset="0%" stopColor={blush} stopOpacity="0.75" />
          <stop offset="100%" stopColor={blush} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hero-lip" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lip} />
          <stop offset="100%" stopColor={lip} stopOpacity="0.85" />
        </linearGradient>
      </defs>

      {/* 뒷머리 */}
      <path d="M38 118 C30 60 62 22 100 22 C138 22 170 60 162 118 L166 178 C150 186 136 184 128 176 L72 176 C64 184 50 186 34 178 Z" fill={HAIR} />

      {/* 목·어깨, 아이보리 상의 */}
      <path d="M84 168 L84 196 C84 204 116 204 116 196 L116 168 Z" fill={SKIN_SHADE} />
      <path d="M22 250 C26 214 54 200 84 194 C92 206 108 206 116 194 C146 200 174 214 178 250 Z" fill="#FBF7F2" />
      <path d="M84 194 C92 206 108 206 116 194" fill="none" stroke="#E8E0D6" strokeWidth="1.5" />

      {/* 귀와 진주 귀걸이 */}
      <ellipse cx="52" cy="118" rx="7" ry="11" fill={SKIN_SHADE} />
      <ellipse cx="148" cy="118" rx="7" ry="11" fill={SKIN_SHADE} />
      <circle cx="52" cy="134" r="3" fill="#FFFDF8" stroke="#E7DED2" strokeWidth="0.8" />
      <circle cx="148" cy="134" r="3" fill="#FFFDF8" stroke="#E7DED2" strokeWidth="0.8" />

      {/* 얼굴: 광대가 살짝 있고 턱이 갸름한 달걀형 */}
      <path d="M54 104 C54 66 74 46 100 46 C126 46 146 66 146 104 C146 134 134 158 116 170 C108 176 92 176 84 170 C66 158 54 134 54 104 Z" fill={SKIN} />

      {/* 볼 블러셔 */}
      <ellipse cx="74" cy="130" rx="17" ry="11" fill="url(#hero-blush)" className="transition-[fill] duration-500" />
      <ellipse cx="126" cy="130" rx="17" ry="11" fill="url(#hero-blush)" />

      {/* 일자 눈썹 */}
      <path d="M68 92 C74 89 84 88 91 90" fill="none" stroke="#4A3833" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M109 90 C116 88 126 89 132 92" fill="none" stroke="#4A3833" strokeWidth="3.2" strokeLinecap="round" />

      {/* 눈: 아몬드형, 속쌍꺼풀 라인과 애교살 */}
      <g>
        <path d="M69 108 C74 101 86 100 92 107" fill="none" stroke={LINE} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M71 104 C77 99 86 99 90 103" fill="none" stroke={LINE} strokeWidth="0.8" strokeOpacity="0.5" strokeLinecap="round" />
        <path d="M70 108 C76 112 86 112 91 107" fill="#FFFDFB" />
        <circle cx="80.5" cy="107" r="4.3" fill="#2E2220" />
        <circle cx="82" cy="105.5" r="1.1" fill="#FFFFFF" />
        <path d="M74 113.5 C78 115 84 115 88 113" fill="none" stroke={SKIN_SHADE} strokeWidth="1" strokeOpacity="0.7" strokeLinecap="round" />

        <path d="M108 107 C114 100 126 101 131 108" fill="none" stroke={LINE} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M110 103 C114 99 123 99 129 104" fill="none" stroke={LINE} strokeWidth="0.8" strokeOpacity="0.5" strokeLinecap="round" />
        <path d="M109 107 C114 112 124 112 130 108" fill="#FFFDFB" />
        <circle cx="119.5" cy="107" r="4.3" fill="#2E2220" />
        <circle cx="121" cy="105.5" r="1.1" fill="#FFFFFF" />
        <path d="M112 113 C116 115 122 115 126 113.5" fill="none" stroke={SKIN_SHADE} strokeWidth="1" strokeOpacity="0.7" strokeLinecap="round" />
      </g>

      {/* 코 */}
      <path d="M101 114 C102 121 103 126 104 129" fill="none" stroke={SKIN_SHADE} strokeWidth="1.2" strokeOpacity="0.6" strokeLinecap="round" />
      <path d="M95 131 C97.5 133.5 102.5 133.5 105 131" fill="none" stroke={SKIN_SHADE} strokeWidth="1.8" strokeLinecap="round" />

      {/* 입술: 윗입술 M자, 아랫입술 도톰하게 */}
      <path d="M86 147 C91 142 96 141 100 144 C104 141 109 142 114 147 C108 149 92 149 86 147 Z" fill="url(#hero-lip)" />
      <path d="M86 147 C92 156 108 156 114 147 C108 149 92 149 86 147 Z" fill="url(#hero-lip)" />
      <path d="M87 147 C94 149 106 149 113 147" fill="none" stroke="#000" strokeOpacity="0.12" strokeWidth="0.8" />
      <ellipse cx="100" cy="151.5" rx="5" ry="1.3" fill="#FFFFFF" fillOpacity="0.35" />

      {/* 앞머리: 이마를 살짝 덮는 시스루 뱅과 옆머리 */}
      <path d="M55 102 C52 62 75 39 100 39 C125 39 148 62 145 102 C140 92 133 86 124 84 C117 85 110 85 104 83 C101 85 98 85 95 83 C89 85 82 85 76 84 C67 86 60 92 55 102 Z" fill={HAIR} />
      <path d="M56 98 C52 120 52 150 58 176 L46 176 C42 150 44 118 56 98 Z" fill={HAIR} />
      <path d="M144 98 C148 120 148 150 142 176 L154 176 C158 150 156 118 144 98 Z" fill={HAIR} />
    </svg>
  );
}
