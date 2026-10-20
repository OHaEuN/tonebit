import { SEASON_INFO, SEASONS } from "@/features/recommend/palettes";

interface BrandMarkProps {
  size: number;
}

/** 파비콘·앱 아이콘 공용. 플럼색 둥근 사각형 위에 네 시즌 대표색 점 2×2 */
export function BrandMark({ size }: BrandMarkProps) {
  const dot = size * 0.3;
  const gap = size * 0.08;
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#000000",
        borderRadius: size * 0.22,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", width: dot * 2 + gap, gap }}>
        {SEASONS.map((season) => (
          <div key={season} style={{ width: dot, height: dot, borderRadius: 999, background: SEASON_INFO[season].accent }} />
        ))}
      </div>
    </div>
  );
}
