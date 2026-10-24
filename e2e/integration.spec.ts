import { expect, test } from "@playwright/test";

/**
 * DB·AI가 붙은 상태의 흐름. CI의 integration 잡에서만 돈다(pgvector 컨테이너 + 가짜 Gemini).
 * 로컬: DATABASE_URL·GEMINI_API_KEY·GEMINI_BASE_URL을 주고 INTEGRATION=1 pnpm e2e e2e/integration.spec.ts
 */
test.skip(!process.env.INTEGRATION, "INTEGRATION=1일 때만");

const MODEL_TIMEOUT = 60_000;

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await page.goto("/try");
  await expect(page.getByText("준비됐어요")).toBeVisible({ timeout: MODEL_TIMEOUT });
  await page.getByLabel(/사진 올리기|사진으로 시작하기/).first().setInputFiles("e2e/fixtures/face.jpg");
  await expect(page.getByText("왜 이렇게 나왔나요")).toBeVisible({ timeout: MODEL_TIMEOUT });
});

test("AI 상담: 추천 질문을 누르면 제품 카드가 나오고, 고른 색이 사진에 발린다", async ({ page }) => {
  const panel = page.locator("section[aria-labelledby=advisor-heading]");
  await panel.getByRole("button", { name: "출근할 때 바를 립 골라 줘" }).click();
  await expect(panel.getByText("첫 번째 색을 사진에 발라 뒀어요")).toBeVisible({ timeout: 30_000 });
  await expect(panel.getByText(/사진에 발라 봤어요/)).toBeVisible();
  const cards = panel.getByRole("button", { name: "발라 보기" });
  await expect(cards.first()).toBeVisible();
  await cards.nth(1).click();
  await expect(page.getByRole("dialog", { name: "사진 크게 보기" })).toBeVisible();
  await expect(page.getByRole("dialog").locator("legend span")).not.toHaveText("선택 안 함");
});

test("결과 바로 아래에서 한 번에 반응을 남기고, 달라요면 전문가 진단 입력으로 이어진다", async ({ page }) => {
  const box = page.getByText("이 결과, 내 생각과 비슷해요?");
  await expect(box).toBeVisible();
  await page.getByRole("button", { name: "달라요" }).click();
  await expect(page.getByText("알려 주셔서 고마워요")).toBeVisible();
  await page.getByRole("button", { name: "전문가 진단을 받아 봤다면 알려 주세요" }).click();
  const form = page.locator("details#expert-feedback");
  await expect(form).toHaveAttribute("open", "");
  await expect(form).toHaveAttribute("data-spotlight", "");
  await expect(form.getByText("받아 본 진단을 골라 주시면")).toBeVisible();
});

test("AI 상담 답에 도움이 됐는지 남긴다", async ({ page }) => {
  const panel = page.locator("section[aria-labelledby=advisor-heading]");
  await panel.getByRole("button", { name: "출근할 때 바를 립 골라 줘" }).click();
  await expect(panel.getByText("첫 번째 색을 사진에 발라 뒀어요")).toBeVisible({ timeout: 30_000 });
  const rated = page.waitForResponse((r) => r.url().endsWith("/api/advisor/rating") && r.ok());
  await panel.getByRole("button", { name: "도움이 됐어요" }).click();
  await rated;
  await expect(panel.getByText("평가 고마워요")).toBeVisible();
});

test("진단 피드백을 보내면 정확도 페이지에 집계된다", async ({ page }) => {
  const count = async () => Number(/지금까지 (?:<!-- -->)?(\d+)(?:<!-- -->)?건/.exec(await (await page.request.get("/accuracy")).text())?.[1]);
  const before = await count();
  expect(before).toBeGreaterThanOrEqual(0);
  const form = page.locator("details", { hasText: "전문가에게 퍼스널 컬러 진단을 받아 봤나요?" });
  await form.locator("summary").click();
  await form.locator("label", { hasText: "여름 쿨" }).first().click();
  await form.getByRole("button", { name: "동의하고 보내기" }).click();
  await expect(page.getByText("보내 주셔서 고마워요")).toBeVisible();
  await expect.poll(count).toBe(before + 1);
});

test("시작할 때 고른 진단은 결과 위 비교 카드에서 버튼 하나로 보내고, 아래 입력 칸은 숨긴다", async ({ page }) => {
  const count = async () => ((await (await page.request.get("/api/feedback/count")).json()) as { n: number }).n;
  const before = await count();
  await page.getByRole("button", { name: "처음부터" }).click();
  await page.locator("#expert").getByText("가을 웜").click();
  await page.getByLabel(/사진 올리기|사진으로 시작하기/).first().setInputFiles("e2e/fixtures/face.jpg");
  await expect(page.getByText("전문가 진단", { exact: true })).toBeVisible({ timeout: MODEL_TIMEOUT });
  await expect(page.getByText(/명이 모이면|명이 알려 줬어요/)).toBeVisible();
  await expect(page.locator("details#expert-feedback")).toHaveCount(0);
  await page.getByRole("button", { name: "동의하고 보내기" }).click();
  await expect(page.getByText("보내 주셔서 고마워요")).toBeVisible();
  await expect.poll(count).toBe(before + 1);
});
