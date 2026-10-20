import type { LightingIssue } from "@/types/analysis";
import { LIGHTING_MESSAGES } from "@/features/analysis/lighting";

interface LightingBadgesProps {
  issues: LightingIssue[];
  faceFound: boolean;
}

export function LightingBadges({ issues, faceFound }: LightingBadgesProps) {
  return (
    <ul aria-live="polite" className="flex flex-wrap gap-2 text-[13px]">
      {!faceFound && <li className="rounded-full bg-card px-3 py-1.5">얼굴을 찾는 중…</li>}
      {faceFound && issues.length === 0 && <li className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-900">조명 좋아요</li>}
      {faceFound &&
        issues.map((issue) => (
          <li key={issue} className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-900">
            {LIGHTING_MESSAGES[issue]}
          </li>
        ))}
    </ul>
  );
}
