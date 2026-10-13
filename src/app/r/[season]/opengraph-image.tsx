import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { isSeason, SEASON_INFO, SEASONS } from "@/features/recommend/palettes";

export const alt = "재미로 보는 컬러 테스트 결과";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return SEASONS.map((season) => ({ season }));
}

const FOOTER = "재미로 보는 퍼스널 컬러 테스트 · 사진은 기기 밖으로 나가지 않아요";

/**
 * 한글 서브셋 폰트. 카드에 쓰이는 글자만 담아 수십 KB다. 문구를 바꾸면 README의 명령으로 다시 만든다.
 * 모듈 스코프에서 읽어 두면 라우트가 정적으로 프리렌더된다.
 */
const fontData = await readFile(join(process.cwd(), "src/app/r/[season]/NotoSansKR-700-subset.ttf"));

export default async function Image({ params }: { params: Promise<{ season: string }> }) {
  const { season } = await params;
  const info = SEASON_INFO[isSeason(season) ? season : "spring"];

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#fbf7f4",
        fontFamily: "NotoSansKR",
        color: "#241f1d",
        padding: 72,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 28, color: "#6b605b" }}>재미로 보는 퍼스널 컬러 테스트</div>
          <div style={{ fontSize: 120, fontWeight: 700, color: info.accent, lineHeight: 1.1, marginTop: 12 }}>
            {`${info.label} ${info.tone}`}
          </div>
          <div style={{ fontSize: 40, marginTop: 16 }}>{info.tagline}</div>
        </div>
        <div style={{ fontSize: 22, color: "#6b605b" }}>{FOOTER}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 20 }}>
        <div style={{ display: "flex", gap: 20 }}>
          {info.lips.slice(0, 3).map((s) => (
            <div key={s.id} style={{ width: 110, height: 110, borderRadius: 999, background: s.hex }} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          {info.lips.slice(3, 6).map((s) => (
            <div key={s.id} style={{ width: 110, height: 110, borderRadius: 999, background: s.hex }} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>
          {info.blushes.map((s) => (
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
