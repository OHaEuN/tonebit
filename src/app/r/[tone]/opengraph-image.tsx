import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { parseTone, SEASON_INFO, SEASONS, sortSwatches, TONE_INFO, TONE_SLUGS, toneLabel } from "@/features/recommend/palettes";

export const alt = "톤픽 컬러 테스트 결과";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return [...TONE_SLUGS, ...SEASONS].map((tone) => ({ tone }));
}

const FOOTER = "톤픽 tonepick · 사진은 기기 밖으로 나가지 않아요";

/** 한글 서브셋 폰트. 카드에 쓰이는 글자만 담았다. 문구를 바꾸면 README의 명령으로 다시 만든다 */
const fontData = await readFile(join(process.cwd(), "src/app/NotoSansKR-700-subset.ttf"));

export default async function Image({ params }: { params: Promise<{ tone: string }> }) {
  const parsed = parseTone((await params).tone) ?? { season: "spring" as const, subtype: "true" as const, tone: "spring-true" as const };
  const seasonInfo = SEASON_INFO[parsed.season];
  const label = toneLabel(parsed.season, parsed.subtype);
  // "겨울 쿨 브라이트"처럼 긴 이름은 한 줄에 들어가도록 줄인다
  const labelSize = label.length > 7 ? 74 : 96;
  const lips = sortSwatches(seasonInfo.lips, parsed.subtype);
  const blushes = sortSwatches(seasonInfo.blushes, parsed.subtype);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#ffffff",
        fontFamily: "NotoSansKR",
        color: "#241f1d",
        padding: 72,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, paddingRight: 40 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 28, color: "#6b605b" }}>톤픽 · 재미로 보는 퍼스널 컬러 테스트</div>
          <div style={{ fontSize: labelSize, fontWeight: 700, color: seasonInfo.accent, lineHeight: 1.1, marginTop: 12 }}>{label}</div>
          <div style={{ fontSize: 34, marginTop: 16 }}>{seasonInfo.tagline}</div>
          <div style={{ fontSize: 24, marginTop: 20, color: "#6b605b" }}>{`어울리는 색: ${TONE_INFO[parsed.tone].best.slice(0, 4).join(", ")}`}</div>
        </div>
        <div style={{ fontSize: 22, color: "#6b605b" }}>{FOOTER}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 20 }}>
        <div style={{ display: "flex", gap: 20 }}>
          {lips.slice(0, 3).map((s) => (
            <div key={s.id} style={{ width: 110, height: 110, borderRadius: 999, background: s.hex }} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          {lips.slice(3, 6).map((s) => (
            <div key={s.id} style={{ width: 110, height: 110, borderRadius: 999, background: s.hex }} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>
          {blushes.map((s) => (
            <div key={s.id} style={{ width: 70, height: 70, borderRadius: 999, background: s.hex }} />
          ))}
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [{ name: "NotoSansKR", data: fontData, weight: 700, style: "normal" }],
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=31536000" },
    },
  );
}
