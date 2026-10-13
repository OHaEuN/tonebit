import type { Swatch } from "@/types/product";

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
  "block size-10 rounded-full border border-black/10 peer-checked:ring-2 peer-checked:ring-fg peer-checked:ring-offset-2 peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2";

/** 네이티브 radio라 키보드(방향키)와 스크린리더가 그냥 된다. 섹션이 여러 개여도 선택은 하나 */
export function ColorPicker({ name, label, sections, value, onChange }: ColorPickerProps) {
  const selected = sections.flatMap((s) => s.swatches).find((s) => s.id === value);
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">
        {label}
        <span className="ml-2 font-normal text-muted">{selected ? selected.name : "선택 안 함"}</span>
      </legend>
      <div className="space-y-2.5">
        {sections.map((section, i) => (
          <div key={section.title ?? i}>
            {section.title && <p className="mb-1.5 text-xs text-muted">{section.title}</p>}
            {/* 한 줄 가로 스크롤로 세로 길이를 줄인다. 첫 줄 맨 앞에 "없음" */}
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1.5">
              {i === 0 && (
                <label className="shrink-0 cursor-pointer">
                  <input type="radio" name={name} className="peer sr-only" checked={value === null} onChange={() => onChange(null)} />
                  <span className="flex size-10 items-center justify-center rounded-full border border-line bg-card text-xs text-muted peer-checked:ring-2 peer-checked:ring-fg peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2">
                    없음
                  </span>
                </label>
              )}
              {section.swatches.map((s) => (
                <label key={s.id} className="shrink-0 cursor-pointer" title={s.name}>
                  <input type="radio" name={name} className="peer sr-only" checked={value === s.id} onChange={() => onChange(s.id)} />
                  <span className={CHIP} style={{ background: s.hex }} />
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
