import { harmonyBreakdown, type HarmonyItem, type RankedItem } from "./harmony";

interface HarmonyBarsProps {
  ranked: Pick<RankedItem<HarmonyItem>, "harmony">;
  className?: string;
}

/** 점수에 들어간 각도(밝기 대비·색 방향·혈색·선명도·색 조화·톤 팔레트·유행…)를 짧은 막대로. 한 숫자 뒤에 무엇이 있는지 보여 준다 */
export function HarmonyBars({ ranked, className = "" }: HarmonyBarsProps) {
  return (
    <ul aria-label="항목별 어울림" className={`flex flex-wrap gap-x-3 gap-y-1 text-[11px] leading-none text-muted ${className}`}>
      {harmonyBreakdown(ranked).map((axis) => {
        const pct = Math.round(axis.value * 100);
        return (
          <li key={axis.key} className="flex items-center gap-1.5">
            <span>{axis.label}</span>
            <span aria-hidden="true" className="inline-block h-1.5 w-8 overflow-hidden rounded-full bg-line">
              <span className="block h-full rounded-full bg-fg" style={{ width: `${pct}%` }} />
            </span>
            <span className="sr-only">{pct}%</span>
          </li>
        );
      })}
    </ul>
  );
}
