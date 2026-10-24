import Link from "next/link";
import type { ReactNode } from "react";

interface SiteHeaderProps {
  /** 오른쪽에 둘 이 페이지의 행동 하나. 없으면 기본 메뉴 */
  action?: ReactNode;
}

const NAV = "font-mono text-[12px] font-medium uppercase tracking-[0.06em] hover:underline underline-offset-4";

export function Wordmark() {
  return <span className="text-[22px] font-extrabold tracking-[-0.06em]">톤빛</span>;
}

export function SiteHeader({ action }: SiteHeaderProps) {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 md:h-16 md:px-8">
        <Link href="/" aria-label="톤빛 홈" className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-fg">
          <Wordmark />
        </Link>
        {action ?? (
          <nav className="flex items-center gap-5">
            <Link href="/#tones" className={NAV}>
              12 Tones
            </Link>
            <Link href="/try" className={NAV}>
              Color test
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
