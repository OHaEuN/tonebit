import type { Metadata } from "next";
import Link from "next/link";
import { TrySession } from "@/features/try/TrySession";

export const metadata: Metadata = { title: "컬러 테스트" };

export default function TryPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 space-y-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-sm text-muted hover:text-fg">
          ← 처음으로
        </Link>
        <h1 className="text-lg font-bold">컬러 테스트</h1>
      </header>
      <TrySession />
    </main>
  );
}
