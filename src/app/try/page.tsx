import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { TrySession } from "@/features/try/TrySession";

export const metadata: Metadata = { title: "컬러 테스트" };

export default function TryPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-10 md:px-8">
        <h1 className="sr-only">컬러 테스트</h1>
        <TrySession />
      </main>
    </>
  );
}
