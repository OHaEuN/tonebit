import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-6xl px-4 text-xs text-muted md:px-8">
      <nav className="flex gap-5 border-t border-line py-8">
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
