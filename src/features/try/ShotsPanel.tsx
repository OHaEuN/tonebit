"use client";

import { MAX_SHOTS, RECOMMENDED_SHOTS } from "@/features/analysis/shots";
import { BUTTON } from "@/components/styles";
import { useAnalysisStore } from "@/stores/analysisStore";
import { ShotTabs } from "./ShotTabs";
import { UploadButton } from "./UploadButton";

interface ShotsPanelProps {
  onAddPhotos: (files: File[]) => void;
  onMeasureMore: () => void;
  /** 업로드한 사진의 미리보기. 카메라 측정엔 없다 */
  photos: { id: number; thumb: string }[];
}

/** 몇 장을 합친 결과인지 보여 주고, 사진별 탭 아래에 한 장 더 받는 버튼을 둔다 */
export function ShotsPanel({ onAddPhotos, onMeasureMore, photos }: ShotsPanelProps) {
  const n = useAnalysisStore((s) => s.shots.length);
  const source = useAnalysisStore((s) => s.source);
  const unit = source === "camera" ? "번 측정" : "장";
  const room = MAX_SHOTS - n;
  const progress = n < RECOMMENDED_SHOTS ? ` (${n}/${RECOMMENDED_SHOTS})` : "";

  return (
    <div className="space-y-3 text-sm">
      <p>
        {n === 1 ? `${source === "camera" ? "측정 1번" : "사진 1장"}으로 본 결과예요.` : `${n}${unit}을 합친 결과예요.`}
      </p>

      <ShotTabs photos={photos} />

      {room > 0 &&
        (source === "camera" ? (
          <button type="button" onClick={onMeasureMore} className={BUTTON.secondary}>
            한 번 더 측정해서 합치기{progress}
          </button>
        ) : (
          <UploadButton onFiles={onAddPhotos} multiple label={`사진 추가해서 합치기${progress}`} />
        ))}
    </div>
  );
}
