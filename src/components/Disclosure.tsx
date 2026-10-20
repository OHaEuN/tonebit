import type { ReactNode, SyntheticEvent } from "react";

interface DisclosureProps {
  title: ReactNode;
  /** 제목 아래 한 줄 설명 */
  hint?: ReactNode;
  children: ReactNode;
  onToggle?: (e: SyntheticEvent<HTMLDetailsElement>) => void;
}

/** 접었다 펴는 행. 상자 대신 위 헤어라인과 여백으로 나눈다 */
export function Disclosure({ title, hint, children, onToggle }: DisclosureProps) {
  return (
    <details className="group border-t border-line" onToggle={onToggle}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-[15px] font-medium">{title}</span>
          {hint && <span className="mt-0.5 block text-[13px] text-muted">{hint}</span>}
        </span>
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="pb-6 text-sm">{children}</div>
    </details>
  );
}
