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
        flexDirection: "column",
        background: "#ffffff",
        fontFamily: "NotoSansKR",
        color: "#1c1618",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "64px 72px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", flexWrap: "wrap", width: 34, gap: 4 }}>
            {SEASONS.map((s) => (
              <div key={s} style={{ width: 15, height: 15, borderRadius: 999, background: SEASON_INFO[s].accent }} />
            ))}
          </div>
          <div style={{ fontSize: 28, color: "#6f676a" }}>톤픽 · 재미로 보는 퍼스널 컬러 테스트</div>
        </div>
        <div style={{ fontSize: labelSize, fontWeight: 700, lineHeight: 1.1, marginTop: 40 }}>{label}</div>
        <div style={{ fontSize: 36, marginTop: 18 }}>{seasonInfo.tagline}</div>
        <div style={{ fontSize: 26, marginTop: 18, color: "#6f676a" }}>{`어울리는 색: ${TONE_INFO[parsed.tone].best.slice(0, 4).join(", ")}`}</div>
      </div>
      <div style={{ display: "flex", height: 96, margin: "0 72px" }}>
        {[...lips, ...blushes].map((s, i, all) => (
          <div
            key={s.id}
            style={{
              flex: 1,
              background: s.hex,
              borderTopLeftRadius: i === 0 ? 48 : 0,
              borderBottomLeftRadius: i === 0 ? 48 : 0,
              borderTopRightRadius: i === all.length - 1 ? 48 : 0,
              borderBottomRightRadius: i === all.length - 1 ? 48 : 0,
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", fontSize: 22, color: "#6f676a", padding: "28px 72px 48px" }}>{FOOTER}</div>
    </div>,
    {
      ...size,
      fonts: [{ name: "NotoSansKR", data: fontData, weight: 700, style: "normal" }],
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=31536000" },
    },
  );
}
