import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-xl px-4 py-8 text-xs text-muted">
      <nav className="flex gap-4">
        <Link href="/accuracy" className="hover:text-fg">
          정확도
        </Link>
        <Link href="/privacy" className="hover:text-fg">
          개인정보처리방침
        </Link>
        <a href="https://github.com/OHaEuN/tonepick" target="_blank" rel="noopener" className="hover:text-fg">
          GitHub
        </a>
      </nav>
    </footer>
  );
}
