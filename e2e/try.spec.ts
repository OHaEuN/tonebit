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
