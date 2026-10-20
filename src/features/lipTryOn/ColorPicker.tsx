import type { Swatch } from "@/types/product";
import { SwatchSmear } from "@/features/swatch/SwatchSmear";
import { seedOf, smearFinish } from "@/features/swatch/smear";

export interface SwatchSection {
  title?: string;
  swatches: Swatch[];
}

interface ColorPickerProps {
  name: string;
  label: string;
  sections: SwatchSection[];
  value: string | null;
  onChange: (id: string | null) => void;
}

const CHIP =
  "block size-11 rounded-full peer-checked:ring-[1.5px] peer-checked:ring-fg peer-checked:ring-offset-2 peer-focus-visible:ring-2 peer-focus-visible:ring-fg peer-focus-visible:ring-offset-2";

/** 네이티브 radio라 키보드(방향키)와 스크린리더가 그냥 된다. 섹션이 여러 개여도 선택은 하나 */
export function ColorPicker({ name, label, sections, value, onChange }: ColorPickerProps) {
  const selected = sections.flatMap((s) => s.swatches).find((s) => s.id === value);
  return (
    // fieldset은 기본 min-inline-size가 min-content라 안의 가로 스크롤 줄만큼 넓어져 화면을 밀어낸다. min-w-0으로 막는다
    <fieldset className="min-w-0">
      <legend className="mb-2 flex min-w-0 items-baseline gap-2 text-[15px] font-semibold">
        {label}
        <span className="truncate text-[13px] font-normal text-muted">{selected ? selected.name : "선택 안 함"}</span>
      </legend>
      <div className="space-y-2.5">
        {sections.map((section, i) => (
          <div key={section.title ?? i}>
            {section.title && <p className="mb-1 text-[12px] text-muted">{section.title}</p>}
            {/* 한 줄 가로 스크롤로 세로 길이를 줄인다. 첫 줄 맨 앞에 "없음".
                relative는 안의 sr-only 라디오(absolute)가 스크롤 영역 밖으로 빠져 페이지 폭을 넓히지 않게 한다 */}
            <div className="relative -mx-1 flex gap-2 overflow-x-auto px-1 py-1.5">
              {i === 0 && (
                <label className="shrink-0 cursor-pointer">
                  <input type="radio" name={name} className="peer sr-only" checked={value === null} onChange={() => onChange(null)} />
                  <span className="flex size-11 items-center justify-center rounded-full border border-dashed border-fg/25 text-[11px] text-muted peer-checked:border-solid peer-checked:border-fg peer-checked:text-fg peer-focus-visible:ring-2 peer-focus-visible:ring-fg peer-focus-visible:ring-offset-2">
                    없음
                  </span>
                </label>
              )}
              {section.swatches.map((s) => (
                <label key={s.id} className="shrink-0 cursor-pointer" title={s.name}>
                  <input type="radio" name={name} className="peer sr-only" checked={value === s.id} onChange={() => onChange(s.id)} />
                  <span className={CHIP}>
                    <SwatchSmear color={s.hex} width={44} height={44} finish={smearFinish(s.finish)} seed={seedOf(s.id)} />
                  </span>
                  <span className="sr-only">{s.name}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
