import type { ReferenceSource, Season, Subtype, ToneSlug } from "@/types/analysis";
import { SEASON_SUBTYPES } from "@/features/analysis/tone";

/**
 * 진단 결과 피드백 한 건. 사진·기기·사람을 알아볼 수 있는 값은 담지 않는다.
 * 측정 숫자(우리 판정의 근거)와 이용자가 받은 전문가 진단만 있다
 */
export interface Feedback {
  /** 전문가 진단 시즌 */
  season: Season;
  /** 전문가 진단 세부 타입. 모르면 null */
  subtype: Subtype | null;
  /** 우리가 낸 판정 */
  predicted: ToneSlug;
  lab: { L: number; a: number; b: number };
  hue: number;
  ita: number;
  /** 합친 사진·측정 수 */
  shots: number;
  source: "camera" | "image";
  corrected: boolean;
  /** 조명 보정에 쓴 기준. 예전 클라이언트는 안 보낸다 */
  reference: ReferenceSource;
}

const REFERENCES: ReferenceSource[] = ["white", "teeth", "sclera", "scene", "none"];

const SEASONS = Object.keys(SEASON_SUBTYPES) as Season[];
const SLUG = /^(spring|summer|autumn|winter)-(light|bright|true|soft|deep)$/;
const finite = (v: unknown, lo: number, hi: number): v is number => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;

/** 요청 본문을 검사해 필요한 필드만 골라낸다. 틀리면 null */
export function parseFeedback(body: unknown): Feedback | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const season = b.season as Season;
  if (!SEASONS.includes(season)) return null;
  const subtype = b.subtype === null ? null : (b.subtype as Subtype);
  if (subtype !== null && !SEASON_SUBTYPES[season].includes(subtype)) return null;
  if (typeof b.predicted !== "string" || !SLUG.test(b.predicted)) return null;
  const lab = b.lab as Record<string, unknown> | undefined;
  if (!lab || !finite(lab.L, -10, 150) || !finite(lab.a, -100, 100) || !finite(lab.b, -100, 100)) return null;
  if (!finite(b.hue, 0, 360) || !finite(b.ita, -90, 90) || !finite(b.shots, 1, 10)) return null;
  if (b.source !== "camera" && b.source !== "image") return null;
  if (typeof b.corrected !== "boolean") return null;
  const reference = b.reference === undefined ? (b.corrected ? "scene" : "none") : (b.reference as ReferenceSource);
  if (!REFERENCES.includes(reference)) return null;
  return {
    season,
    subtype,
    predicted: b.predicted as ToneSlug,
    lab: { L: lab.L, a: lab.a, b: lab.b },
    hue: b.hue,
    ita: b.ita,
    shots: Math.round(b.shots),
    source: b.source,
    corrected: b.corrected,
    reference,
  };
}
