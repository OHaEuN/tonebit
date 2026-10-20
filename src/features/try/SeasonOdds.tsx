import type { Season } from "@/types/analysis";
import { runnerUp } from "@/features/analysis/tone";
import { SEASON_INFO } from "@/features/recommend/palettes";

interface SeasonOddsProps {
  season: Season;
  odds: Record<Season, number>;
}

const percent = (p: number) => `${Math.round(p * 100)}%`;

/** 판정 시즌의 가능성과 다음 후보. 셀카 판정은 한 시즌을 단정할 만큼 정확하지 않아 둘을 같이 보여 준다 */
export function SeasonOdds({ season, odds }: SeasonOddsProps) {
  const next = runnerUp(season, odds);
  return (
    <p className="text-[13px] text-muted">
      가능성 <strong className="font-semibold text-fg">{percent(odds[season])}</strong> · 다음 후보 {SEASON_INFO[next].label} {SEASON_INFO[next].tone} {percent(odds[next])}
    </p>
  );
}
