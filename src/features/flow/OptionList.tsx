import type { ReactNode } from "react";

export interface Option<K extends string> {
  key: K;
  title: string;
  body: string;
  /** 왼쪽 그림(색 자국 등) */
  visual?: ReactNode;
}

interface OptionListProps<K extends string> {
  label: string;
  options: Option<K>[];
  onPick: (key: K) => void;
}

/** 질문 하나에 답 하나. 행 전체가 버튼이고, 누르면 바로 다음 화면으로 간다 */
export function OptionList<K extends string>({ label, options, onPick }: OptionListProps<K>) {
  return (
    <ul aria-label={label} className="divide-y divide-line border-y border-line">
      {options.map((o) => (
        <li key={o.key}>
          <button
            type="button"
            onClick={() => onPick(o.key)}
            className="flex w-full items-center gap-4 py-4 text-left transition-colors hover:bg-card active:bg-card focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-fg"
          >
            {o.visual && <span className="flex shrink-0 items-center">{o.visual}</span>}
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-semibold tracking-tight">{o.title}</span>
              <span className="mt-0.5 block text-[13px] text-muted">{o.body}</span>
            </span>
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="m7.5 4 6 6-6 6" />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  );
}
