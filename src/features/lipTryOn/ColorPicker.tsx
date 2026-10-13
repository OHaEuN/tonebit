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
      <div className="space-y-3">
        <label className="inline-block cursor-pointer">
          <input type="radio" name={name} className="peer sr-only" checked={value === null} onChange={() => onChange(null)} />
          <span className="flex size-10 items-center justify-center rounded-full border border-line bg-card text-xs text-muted peer-checked:ring-2 peer-checked:ring-fg peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2">
            없음
          </span>
        </label>
        {sections.map((section, i) => (
          <div key={section.title ?? i}>
            {section.title && <p className="mb-1.5 text-xs text-muted">{section.title}</p>}
            <div className="flex flex-wrap gap-2">
              {section.swatches.map((s) => (
                <label key={s.id} className="cursor-pointer" title={s.name}>
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
