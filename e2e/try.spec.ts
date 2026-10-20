import { expect, test, type Page } from "@playwright/test";

const MODEL_TIMEOUT = 60_000;
/** 1×1 PNG. 얼굴이 없는 입력 */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==",
  "base64",
);

async function waitForModel(page: Page) {
  await page.goto("/try");
  await expect(page.getByText("준비됐어요")).toBeVisible({ timeout: MODEL_TIMEOUT });
}

test("카메라 권한이 거부되면 업로드 경로를 안내한다", async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("denied", "NotAllowedError"));
  });
  await waitForModel(page);
  await page.getByRole("button", { name: "카메라로 시작" }).click();
  await expect(page.getByText("카메라 권한이 거부됐어요")).toBeVisible();
  await expect(page.getByLabel("사진 올리기").first()).toBeVisible();
});

test("가짜 카메라로 라이브 단계에 들어간다", async ({ page }) => {
  await waitForModel(page);
  await page.getByRole("button", { name: "카메라로 시작" }).click();
  await expect(page.getByText("얼굴을 찾는 중")).toBeVisible({ timeout: MODEL_TIMEOUT });
  await expect(page.getByRole("button", { name: "측정 시작" })).toBeDisabled();
});

test("얼굴이 없는 사진은 안내 문구를 보여준다", async ({ page }) => {
  await waitForModel(page);
  await page.getByLabel("사진 올리기").first().setInputFiles({ name: "blank.png", mimeType: "image/png", buffer: TINY_PNG });
  await expect(page.getByText("얼굴을 찾지 못했어요")).toBeVisible({ timeout: MODEL_TIMEOUT });
});

test("셀카를 올리면 결과와 립 팔레트가 나오고 결과 카드로 이동한다", async ({ page }) => {
  await waitForModel(page);
  await page.getByLabel("사진 올리기").first().setInputFiles("e2e/fixtures/face.jpg");
  const heading = page.getByRole("heading", { level: 2, name: /(봄|여름|가을|겨울) (웜|쿨)/ });
  await expect(heading).toBeVisible({ timeout: MODEL_TIMEOUT });
  await expect(page.getByText("왜 이렇게 나왔나요")).toBeVisible();
  await page.getByRole("tab", { name: "발라 보기", exact: true }).click();
  // 라디오는 sr-only라 색상 칩(label)을 클릭한다
  // 발라 보기 탭의 fieldset 순서: 팔레트 시즌 전환, 립(기본 선택)
  const firstLip = page.locator("fieldset").nth(1).locator("label[title]").first();
  await firstLip.click();
  await expect(firstLip.getByRole("radio")).toBeChecked();
  await page.getByRole("tab", { name: "결과", exact: true }).click();
  await page.getByRole("link", { name: "결과 카드와 추천 보기" }).click();
  await expect(page).toHaveURL(/\/r\/(spring|summer|autumn|winter)-(light|bright|true|soft|deep)$/);
});

test("결과에 시즌 가능성과 내 얼굴 기준 립 순위가 나오고, 고른 립의 어울림 점수를 보여 준다", async ({ page }) => {
  await waitForModel(page);
  await page.getByLabel("사진 올리기").first().setInputFiles("e2e/fixtures/face.jpg");
  await expect(page.getByText(/가능성 \d+% · 다음 후보/)).toBeVisible({ timeout: MODEL_TIMEOUT });
  const picks = page.getByRole("region", { name: "내 얼굴 기준 어울리는 립" });
  await expect(picks.getByRole("listitem")).toHaveCount(3);
  await picks.getByRole("button", { name: "발라 보기" }).first().click();
  await expect(page.getByRole("tab", { name: "발라 보기", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText(/어울림 \d+점 · 전체 \d+개 중 \d+위/)).toBeVisible();
});

test("두 색 중 고르기를 여섯 번 하면 직접 고른 톤을 알려 준다", async ({ page }) => {
  await waitForModel(page);
  await page.getByLabel("사진 올리기").first().setInputFiles("e2e/fixtures/face.jpg");
  await expect(page.getByText("왜 이렇게 나왔나요")).toBeVisible({ timeout: MODEL_TIMEOUT });
  await page.getByRole("tab", { name: "발라 보기", exact: true }).click();
  await page.getByText("두 색 중 골라서 내 톤 확인하기").click();
  for (let i = 0; i < 6; i++) await page.getByRole("button", { name: /가 더 나아요$/ }).click();
  await expect(page.getByText(/직접 고른 톤은 (봄|여름|가을|겨울) (웜|쿨)이에요/)).toBeVisible();
});

test("흰 종이에 칠한 사진에서 종이와 칠한 곳을 누르면 제품 색을 재서 내 제품으로 저장한다", async ({ page }) => {
  await waitForModel(page);
  await page.getByLabel("사진 올리기").first().setInputFiles("e2e/fixtures/face.jpg");
  await expect(page.getByText("왜 이렇게 나왔나요")).toBeVisible({ timeout: MODEL_TIMEOUT });
  await page.getByRole("tab", { name: "발라 보기", exact: true }).click();
  const scanner = page.locator("details", { hasText: "내가 가진 립 색 재기" });
  await scanner.locator("summary").click();
  // 노란 조명 아래 흰 종이(가장자리)에 #C8283E를 칠한(가운데) 합성 사진
  await scanner.getByLabel("사진 올리기").setInputFiles("e2e/fixtures/swatch.jpg");
  const photo = scanner.locator("canvas");
  await photo.click({ position: { x: 10, y: 10 } });
  await expect(scanner.getByText("칠한 곳의 가운데를 눌러 주세요")).toBeVisible();
  const box = (await photo.boundingBox())!;
  await photo.click({ position: { x: box.width / 2, y: box.height / 2 } });
  const read = scanner.getByText(/#[0-9A-F]{6} · /);
  await expect(read).toBeVisible();
  const hex = (await read.textContent())!.match(/#([0-9A-F]{6})/)![1];
  const channels = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  // 조명을 지우고 칠한 색(#C8283E)을 JPEG 압축 오차 안에서 되찾는다
  [0xc8, 0x28, 0x3e].forEach((want, i) => expect(Math.abs(channels[i] - want)).toBeLessThanOrEqual(4));
  await scanner.getByLabel("립 이름").fill("테스트 레드");
  await scanner.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("내 제품", { exact: true })).toBeVisible();
  await expect(page.getByRole("radio", { name: "테스트 레드" })).toBeChecked();
});

test.describe("폰 화면 폭", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("발라 보기에서 색이 많은 팔레트로 바꿔도 화면이 가로로 넓어지지 않는다", async ({ page }) => {
    await waitForModel(page);
    await page.getByLabel("사진 올리기").first().setInputFiles("e2e/fixtures/face.jpg");
    await expect(page.getByText("왜 이렇게 나왔나요")).toBeVisible({ timeout: MODEL_TIMEOUT });
    await page.getByRole("tab", { name: "발라 보기", exact: true }).click();
    for (const season of ["봄 웜", "여름 쿨", "가을 웜", "겨울 쿨"]) {
      await page.locator("label", { hasText: season }).first().click();
      for (const part of ["립", "블러셔"]) {
        await page.getByRole("tab", { name: part, exact: true }).click();
        const [scroll, client] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
        expect(scroll, `${season} ${part}`).toBeLessThanOrEqual(client);
      }
    }
    await page.getByRole("tab", { name: "립", exact: true }).click();
    await page.getByText("두 색 중 골라서 내 톤 확인하기").click();
    await page.getByText("내가 가진 립 색 재기").click();
    const [scroll, client] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(scroll, "셀프 비교·색 재기를 펼쳐도").toBeLessThanOrEqual(client);
  });
});
