import { expect, test } from "@playwright/test";

test("결과 페이지는 팔레트·제품·공유 버튼을 보여준다", async ({ page }) => {
  await page.goto("/r/spring");
  await expect(page.getByRole("heading", { level: 1, name: "봄 웜" })).toBeVisible();
  const shop = page.getByRole("link", { name: "쿠팡에서 보기" }).first();
  await expect(shop).toBeVisible();
  await expect(shop).toHaveAttribute("href", /link\.coupang\.com\/re\/AFFSRP\?lptag=AF/);
  await expect(page.getByRole("button", { name: "결과 공유하기" })).toBeVisible();
  await expect(page.getByLabel("광고")).toBeVisible();
});

test("OG 카드 이미지는 PNG로 응답한다", async ({ request }) => {
  const res = await request.get("/r/winter/opengraph-image");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("image/png");
});

test("없는 시즌은 404", async ({ page }) => {
  const res = await page.goto("/r/nope");
  expect(res?.status()).toBe(404);
});
