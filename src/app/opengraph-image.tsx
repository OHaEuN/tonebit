import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SEASON_INFO, SEASONS } from "@/features/recommend/palettes";

export const alt = "톤픽 · 퍼스널 컬러 & 립 가상 체험";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fontData = await readFile(join(process.cwd(), "src/app/NotoSansKR-700-subset.ttf"));

/** 사이트 공통 링크 썸네일. 네 시즌 팔레트를 한눈에 */
export default async function Image() {
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
          <div style={{ fontSize: 30, color: "#7a1e3f", fontWeight: 700 }}>톤픽 tonepick</div>
          <div style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.2, marginTop: 20 }}>내 피부톤에 맞는</div>
          <div style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.2 }}>립과 블러셔를</div>
          <div style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.2 }}>얼굴에 직접 얹어 보세요</div>
          <div style={{ fontSize: 26, marginTop: 24, color: "#6b605b" }}>웹캠이나 셀카로 10초면 돼요. 재미로 보는 퍼스널 컬러 테스트</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 24, color: "#6b605b" }}>
          <div style={{ width: 14, height: 14, borderRadius: 999, background: "#7a1e3f" }} />
          사진은 기기 밖으로 나가지 않아요
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 }}>
        {SEASONS.map((season) => (
          <div key={season} style={{ display: "flex", gap: 18 }}>
            {SEASON_INFO[season].lips.slice(0, 4).map((s) => (
              <div key={s.id} style={{ width: 72, height: 72, borderRadius: 999, background: s.hex }} />
            ))}
          </div>
        ))}
      </div>
    </div>,
    {
      ...size,
      fonts: [{ name: "NotoSansKR", data: fontData, weight: 700, style: "normal" }],
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=31536000" },
    },
  );
}
