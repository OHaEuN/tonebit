import { harmonyBreakdown, type HarmonyItem, type RankedItem } from "./harmony";

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
 * 점수에 들어간 각도(밝기 대비·색 방향·혈색·선명도·색 조화·톤 팔레트·유행…)를 한 줄씩 가로 막대로.
 * 한 숫자 뒤에 무엇이 있는지, 어디서 깎였는지 색으로 바로 보이게 한다
 */
export function HarmonyBars({ ranked, className = "" }: HarmonyBarsProps) {
  return (
    <ul aria-label="항목별 어울림" className={`space-y-1.5 text-[12px] leading-none ${className}`}>
      {harmonyBreakdown(ranked).map((axis) => {
        const pct = Math.round(axis.value * 100);
        return (
          <li key={axis.key} className="flex items-center gap-2.5">
            <span className="w-14 shrink-0 text-muted">{axis.label}</span>
            <span aria-hidden="true" className="h-2 flex-1 overflow-hidden rounded-full bg-line">
              <span className={`block h-full rounded-full ${barColor(axis.value)}`} style={{ width: `${pct}%` }} />
            </span>
            <span className="w-8 shrink-0 text-right tabular-nums">
              {pct}
              <span className="text-muted">%</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
