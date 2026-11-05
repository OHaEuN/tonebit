import { harmonyBreakdown, type HarmonyItem, type RankedItem } from "./harmony";
import { AXIS_STATEMENT } from "./preference";

interface HarmonyBarsProps {
  ranked: Pick<RankedItem<HarmonyItem>, "harmony">;
  className?: string;
}

/** 잘 맞음(초록) · 보통(노랑) · 안 맞음(분홍)의 경계 */
const GOOD = 0.7;
const OK = 0.4;

function barColor(value: number): string {
  if (value >= GOOD) return "bg-emerald-500";
  if (value >= OK) return "bg-amber-400";
  return "bg-rose-400";
}

/**
 * 점수에 들어간 각도를 한 줄씩 "이 말이 얼마나 맞는지" 막대로. 어디서 깎였는지 색으로 바로 보인다.
 * 칸이 넓으면(20rem 이상) 문장 옆에 막대, 좁으면(비교 화면의 반 칸) 문장 아래에 막대
 */
export function HarmonyBars({ ranked, className = "" }: HarmonyBarsProps) {
  return (
    <div className={`@container ${className}`}>
      <ul aria-label="항목별 어울림" className="space-y-1.5 text-[12px] leading-none @xs:space-y-1.5">
        <li className="pb-0.5 text-[11px] text-muted">막대가 길수록 그 말이 맞아요</li>
        {harmonyBreakdown(ranked).map((axis) => {
          const pct = Math.round(axis.value * 100);
          return (
            <li key={axis.key} className="flex flex-col gap-1 @xs:flex-row @xs:items-center @xs:gap-2.5">
              <span className="shrink-0 text-fg @xs:w-[8.5rem]">{AXIS_STATEMENT[axis.key]}</span>
              <span className="flex min-w-0 flex-1 items-center gap-2.5">
                <span aria-hidden="true" className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-line">
                  <span className={`block h-full rounded-full ${barColor(axis.value)}`} style={{ width: `${pct}%` }} />
                </span>
                <span className="w-8 shrink-0 text-right tabular-nums">
                  {pct}
                  <span className="text-muted">%</span>
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
