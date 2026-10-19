import { expect, test } from "@playwright/test";

test("결과 페이지는 팔레트·제품·공유 버튼을 보여준다", async ({ page }) => {
  await page.goto("/r/spring-light");
  await expect(page.getByRole("heading", { level: 1, name: "봄 웜 라이트" })).toBeVisible();
  await expect(page.getByText("이런 특징이 있어요")).toBeVisible();
  const shop = page.getByRole("link", { name: "쿠팡에서 보기" }).first();
  await expect(shop).toBeVisible();
  await expect(shop).toHaveAttribute("href", /link\.coupang\.com\/re\/AFFSRP\?lptag=AF/);
  await expect(page.getByRole("button", { name: "결과 공유하기" })).toBeVisible();
});

test("OG 카드 이미지는 PNG로 응답한다", async ({ request }) => {
  const res = await request.get("/r/winter/opengraph-image");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("image/png");
});

test("시즌만 있는 옛 링크는 트루 타입으로 열린다", async ({ page }) => {
  await page.goto("/r/spring");
  await expect(page.getByRole("heading", { level: 1, name: "봄 웜 트루" })).toBeVisible();
});

test("사이트맵은 12개 톤 페이지를, robots는 사이트맵 주소를 알린다", async ({ request }) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect(xml.match(/<loc>[^<]*\/r\/(spring|summer|autumn|winter)-(light|bright|true|soft|deep)<\/loc>/g)).toHaveLength(12);
  expect(xml).not.toContain("/r/spring</loc>");
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  const txt = await robots.text();
  expect(txt).toMatch(/Sitemap: .*\/sitemap\.xml/);
  expect(txt).toContain("Disallow: /api/");
});

test("없는 톤은 404", async ({ page }) => {
  expect((await page.goto("/r/nope"))?.status()).toBe(404);
  expect((await page.goto("/r/spring-deep"))?.status()).toBe(404);
});
