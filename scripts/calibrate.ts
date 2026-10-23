/**
 * 전문가 진단 피드백으로 판정 기준값을 다시 맞춘다. GitHub Actions가 매주 돌리고,
 * 바꿀 만하면 calibration.json을 고쳐 PR을 연다(사람이 확인하고 머지해야 배포된다).
 * 사용: DATABASE_URL=... pnpm calibrate [--dry-run]
 */
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import { calibrate, type LabeledSample } from "../src/features/analysis/calibrate";
import { CURRENT_THRESHOLDS } from "../src/features/analysis/tone";
import type { Season } from "../src/types/analysis";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL이 없어요");
const dryRun = process.argv.includes("--dry-run");
const file = join(__dirname, "..", "src", "features", "analysis", "calibration.json");
const calibration = JSON.parse(readFileSync(file, "utf8"));
const sql = postgres(url, { prepare: false, max: 1 });

const SEASON_KO: Record<Season, string> = { spring: "봄", summer: "여름", autumn: "가을", winter: "겨울" };
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

async function main() {
  try {
    const rows = await sql<{ hue: number; ita: number; lab_b: number; expert_season: Season }[]>`
      select hue, ita, lab_b, expert_season from feedback order by id
    `;
    const samples: LabeledSample[] = rows.map((r) => ({ hue: r.hue, yellow: r.lab_b, ita: r.ita, expert: r.expert_season }));
    const report = calibrate(samples, CURRENT_THRESHOLDS);

    const seasons = Object.keys(report.confusion) as Season[];
    const summary = [
      `## 판정 기준 재보정`,
      ``,
      `- 전문가 진단 ${report.n}건`,
      `- 지금 기준(${calibration.version}) 일치율: ${pct(report.currentAccuracy)}`,
      `- 새 기준 교차검증 일치율: ${pct(report.cvAccuracy)}`,
      `- 결정: **${report.apply ? "바꿈" : "그대로"}** — ${report.reason}`,
      ``,
      `| | 지금 | 제안 |`,
      `|---|---|---|`,
      `| 웜/쿨 중심 hue | ${report.current.hueCenter}° | ${report.proposed.hueCenter}° |`,
      `| 뉴트럴일 때 웜 b* 하한 | ${report.current.yellowWarmMin} | ${report.proposed.yellowWarmMin} |`,
      `| 라이트 ITA 하한 | ${report.current.itaLightMin}° | ${report.proposed.itaLightMin}° |`,
      ``,
      `전문가(행) × 제안 기준 판정(열)`,
      ``,
      `| | ${seasons.map((s) => SEASON_KO[s]).join(" | ")} |`,
      `|---|${seasons.map(() => "---").join("|")}|`,
      ...seasons.map((e) => `| ${SEASON_KO[e]} | ${seasons.map((p) => report.confusion[e][p]).join(" | ")} |`),
    ].join("\n");
    console.log(summary);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + "\n");
    writeFileSync(join(__dirname, "..", "calibration-report.md"), summary + "\n");

    if (!dryRun) {
      await sql`
        insert into calibration_runs (n, current_version, current_accuracy, cv_accuracy, params, applied, reason)
        values (${report.n}, ${calibration.version}, ${report.currentAccuracy}, ${report.cvAccuracy}, ${sql.json({ ...report.proposed })}, ${report.apply}, ${report.reason})
      `;
      if (report.apply) {
        const today = new Date().toISOString().slice(0, 10);
        writeFileSync(
          file,
          JSON.stringify(
            {
              version: `${today}-expert`,
              basis: `전문가 진단 피드백 ${report.n}건으로 재보정 (교차검증 일치율 ${pct(report.cvAccuracy)})`,
              ...report.proposed,
              chromaClearMin: calibration.chromaClearMin,
              expert: { n: report.n, cvAccuracy: Math.round(report.cvAccuracy * 1000) / 1000, previousAccuracy: Math.round(report.currentAccuracy * 1000) / 1000, date: today },
            },
            null,
            2,
          ) + "\n",
        );
        console.log("calibration.json을 고쳤어요");
      }
    }
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
