import { expect, test } from "@playwright/test";

test("랜딩에서 프라이버시 안내를 보고 체험 페이지로 간다", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("사진은 기기 밖으로 나가지 않아요")).toBeVisible();
  await page.getByRole("link", { name: "지금 해보기" }).click();
  await expect(page).toHaveURL(/\/try$/);
});
