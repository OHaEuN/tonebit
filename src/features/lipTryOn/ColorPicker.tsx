import type { Swatch } from "@/types/product";

interface ColorPickerProps {
  name: string;
  label: string;
  swatches: Swatch[];
  value: string | null;
  onChange: (id: string | null) => void;
}

/** 네이티브 radio라 키보드(방향키)와 스크린리더가 그냥 된다 */
export function ColorPicker({ name, label, swatches, value, onChange }: ColorPickerProps) {
  const selected = swatches.find((s) => s.id === value);
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">
        {label}
        <span className="ml-2 font-normal text-muted">{selected ? selected.name : "선택 안 함"}</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        <label className="cursor-pointer">
          <input type="radio" name={name} className="peer sr-only" checked={value === null} onChange={() => onChange(null)} />
          <span className="flex size-10 items-center justify-center rounded-full border border-line bg-card text-xs text-muted peer-checked:ring-2 peer-checked:ring-fg peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2">
            없음
          </span>
        </label>
        {swatches.map((s) => (
          <label key={s.id} className="cursor-pointer" title={s.name}>
            <input type="radio" name={name} className="peer sr-only" checked={value === s.id} onChange={() => onChange(s.id)} />
            <span
              className="block size-10 rounded-full border border-black/10 peer-checked:ring-2 peer-checked:ring-fg peer-checked:ring-offset-2 peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2"
              style={{ background: s.hex }}
            />
            <span className="sr-only">{s.name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
