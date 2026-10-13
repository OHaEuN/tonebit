interface ApplyControlsProps<S extends string> {
  name: string;
  styles: Record<S, { label: string }>;
  style: S;
  onStyle: (s: S) => void;
  intensity: number;
  onIntensity: (v: number) => void;
}

/** 바르는 방법(라디오)과 진하기(슬라이더). 립·블러셔가 같은 모양을 쓴다 */
export function ApplyControls<S extends string>({ name, styles, style, onStyle, intensity, onIntensity }: ApplyControlsProps<S>) {
  const keys = Object.keys(styles) as S[];
  return (
    <div className="mt-3 space-y-3 rounded-2xl bg-card p-3">
      <div role="radiogroup" aria-label={`${name} 바르는 방법`} className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-muted">바르는 방법</span>
        {keys.map((k) => (
          <label key={k} className="cursor-pointer">
            <input type="radio" name={`${name}-style`} className="peer sr-only" checked={style === k} onChange={() => onStyle(k)} />
            <span className="inline-block rounded-full border border-line bg-bg px-3 py-1 text-sm peer-checked:border-fg peer-checked:bg-fg peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2">
              {styles[k].label}
            </span>
          </label>
        ))}
      </div>
      <label className="flex items-center gap-3 text-sm">
        <span className="shrink-0 text-xs text-muted">진하기</span>
        <input
          type="range"
          min={0.2}
          max={1}
          step={0.05}
          value={intensity}
          onChange={(e) => onIntensity(Number(e.target.value))}
          aria-label={`${name} 진하기`}
          className="block w-full accent-accent"
        />
        <span className="w-10 shrink-0 text-right tabular-nums text-muted">{Math.round(intensity * 100)}%</span>
      </label>
    </div>
  );
}
