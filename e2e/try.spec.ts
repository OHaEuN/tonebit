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

/** 셀카를 올리고 1단계(내 톤)가 뜰 때까지 */
async function uploadFace(page: Page, file = "e2e/fixtures/face.jpg") {
  await page.getByLabel(/사진 올리기|사진으로 시작하기/).first().setInputFiles(file);
  await expect(page.getByRole("heading", { level: 2, name: /(봄|여름|가을|겨울) (웜|쿨)/ })).toBeVisible({ timeout: MODEL_TIMEOUT });
}

/** 내 톤 → 취향 두 질문 → 둘 중 고르기 건너뛰기 → 내 립(5단계) */
async function toMatch(page: Page) {
  await page.getByRole("button", { name: "어울리는 립 찾기" }).click();
  await page.getByRole("button", { name: /자연스럽고 세련된/ }).click();
  await page.getByRole("button", { name: /상관없어요/ }).click();
  await page.getByRole("button", { name: "건너뛰기" }).click();
  await expect(page.getByRole("heading", { name: "내 얼굴에 어울리는 립" })).toBeVisible();
}

/** 내 립에서 1등을 얼굴에 발라 보기로 */
async function toTryOn(page: Page) {
  await toMatch(page);
  await page.getByRole("button", { name: "1등 립 얼굴에 발라 보기" }).click();
  await expect(page.getByRole("tab", { name: "립", exact: true })).toBeVisible();
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

test("셀카를 올리면 내 톤이 나오고, 취향을 답해 내 립을 거쳐 발라 보기와 결과 카드로 간다", async ({ page }) => {
  await waitForModel(page);
  await uploadFace(page);
  await expect(page.getByRole("img", { name: /^팔레트:/ })).toBeVisible();
  await toTryOn(page);
  // 라디오는 sr-only라 색상 칩(label)을 클릭한다. 발라 보기의 fieldset 순서: 팔레트 시즌 전환, 립(기본 선택)
  const firstLip = page.locator("fieldset").nth(1).locator("label[title]").first();
  await firstLip.click();
  await expect(firstLip.getByRole("radio")).toBeChecked();
  await page.getByRole("button", { name: "결과로 돌아가기" }).click();
  await expect(page.getByRole("heading", { name: "내 얼굴에 어울리는 립" })).toBeVisible();
  await page.getByRole("link", { name: "결과 카드와 추천 보기" }).click();
  await expect(page).toHaveURL(/\/r\/(spring|summer|autumn|winter)-(light|bright|true|soft|deep)$/);
});

test("브라우저 뒤로 가기가 이전 단계로 돌아간다", async ({ page }) => {
  await waitForModel(page);
  await uploadFace(page);
  await page.getByRole("button", { name: "어울리는 립 찾기" }).click();
  await expect(page.getByRole("heading", { name: "어떤 느낌의 립을 원해요?" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { level: 2, name: /(봄|여름|가을|겨울) (웜|쿨)/ })).toBeVisible();
  await expect(page).toHaveURL(/\/try$/);
});

test("내 톤에 시즌 가능성이 나오고, 내 립 순위의 각 행에 항목별 점수가 있고, 고른 립의 어울림 점수를 발라 보기에서 보여 준다", async ({ page }) => {
  await waitForModel(page);
  await uploadFace(page);
  await expect(page.getByText(/가능성 \d+% · 다음 후보/)).toBeVisible();
  await toMatch(page);
  const picks = page.getByRole("list", { name: "내 얼굴 기준 립 순위" });
  await expect(picks.locator("> li")).toHaveCount(5);
  await picks.getByText("왜 이 점수예요?").first().click();
  // 취향(느낌)을 답했으니 원하는 느낌 항이 켜져 아홉 각도 + 설명 줄 하나
  await expect(picks.getByRole("list", { name: "항목별 어울림" }).first().getByRole("listitem")).toHaveCount(9);
  await picks.getByRole("button", { name: "발라 보기" }).first().click();
  await expect(page.getByText(/어울림 \d+점 · 전체 \d+개 중 \d+위/)).toBeVisible();
});

test("내 립에서 가장 안 어울리는 립과 1등을 내 얼굴에 얹어 나란히 보여 주고, 순위에서 바로 살 수 있다", async ({ page }) => {
  await waitForModel(page);
  await uploadFace(page);
  await toMatch(page);
  const rows = page.getByRole("list", { name: "내 얼굴 기준 립 순위" });
  for (const crop of await rows.getByRole("img", { name: /바른 얼굴$/ }).all()) expect(await crop.getAttribute("src")).toMatch(/^data:image\/jpeg/);
  const buy = rows.getByRole("link", { name: "구매" }).first();
  await expect(buy).toHaveAttribute("href", /link\.coupang\.com/);
  await expect(buy).toHaveAttribute("rel", /sponsored/);
  await page.getByText("가장 안 어울리는 립과 나란히 보기").click();
  const faceOff = page.getByRole("region", { name: "안 어울리는 립 vs 어울리는 립" });
  await expect(faceOff).toBeVisible();
  await expect(faceOff.getByRole("img", { name: /바른 얼굴$/ })).toHaveCount(2);
  await expect(faceOff.getByText("Worst")).toBeVisible();
  await expect(faceOff.getByText("Best")).toBeVisible();
});

test("둘 중 고르기를 일곱 번 하면 내 립 순위에 내 1등 꼬리표가 붙는다", async ({ page }) => {
  await waitForModel(page);
  await uploadFace(page);
  await page.getByRole("button", { name: "어울리는 립 찾기" }).click();
  await page.getByRole("button", { name: /또렷하고 매혹적인/ }).click();
  await page.getByRole("button", { name: /촉촉하게 반짝이는/ }).click();
  await expect(page.getByRole("heading", { name: "어느 쪽이 더 마음에 들어요?" })).toBeVisible();
  await expect(page.getByText("8강 1/4")).toBeVisible();
  for (let i = 0; i < 7; i++) {
    const picks = page.getByRole("button", { name: /바른 얼굴 고르기$/ });
    await expect(picks).toHaveCount(2);
    expect(await picks.first().locator("img").getAttribute("src")).toMatch(/^data:image\/jpeg/);
    await picks.first().click();
  }
  await expect(page.getByRole("heading", { name: "내 얼굴에 어울리는 립" })).toBeVisible();
  await expect(page.getByText("내 1등", { exact: true })).toBeVisible();
  await expect(page.getByText("방금 고른 취향에 맞춘 순위예요")).toBeVisible();
  await expect(page.getByText("방금 고른 7번이 바꾼 것")).toBeVisible();
  await expect(page.getByText(/끝까지 이긴 립은 전체 \d+위예요/)).toBeVisible();
});

test("두 색 중 고르기를 여섯 번 하면 직접 고른 톤을 알려 준다", async ({ page }) => {
  await waitForModel(page);
  await uploadFace(page);
  await toTryOn(page);
  await page.getByText("두 색 중 골라서 내 톤 확인하기").click();
  for (let i = 0; i < 6; i++) await page.getByRole("button", { name: /가 더 나아요$/ }).click();
  await expect(page.getByText(/직접 고른 톤은 (봄|여름|가을|겨울) (웜|쿨)이에요/)).toBeVisible();
});

test("흰 종이에 칠한 사진에서 종이와 칠한 곳을 누르면 제품 색을 재서 내 제품으로 저장한다", async ({ page }) => {
  await waitForModel(page);
  await uploadFace(page);
  await toTryOn(page);
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

  test("어느 단계에서도, 발라 보기에서 색이 많은 팔레트로 바꿔도 화면이 가로로 넓어지지 않는다", async ({ page }) => {
    const fits = async (label: string) => {
      const [scroll, client] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      expect(scroll, label).toBeLessThanOrEqual(client);
    };
    await waitForModel(page);
    await uploadFace(page);
    await fits("내 톤");
    await page.getByRole("button", { name: "어울리는 립 찾기" }).click();
    await fits("느낌");
    await page.getByRole("button", { name: /화사하고 생기 있는/ }).click();
    await fits("질감");
    await page.getByRole("button", { name: /보송하게 번지는/ }).click();
    await fits("고르기");
    await page.getByRole("button", { name: "건너뛰기" }).click();
    await fits("내 립");
    await page.getByRole("button", { name: "1등 립 얼굴에 발라 보기" }).click();
    for (const season of ["봄 웜", "여름 쿨", "가을 웜", "겨울 쿨"]) {
      await page.locator("label", { hasText: season }).first().click();
      for (const part of ["립", "블러셔"]) {
        await page.getByRole("tab", { name: part, exact: true }).click();
        await fits(`${season} ${part}`);
      }
    }
    await page.getByRole("tab", { name: "립", exact: true }).click();
    await page.getByText("두 색 중 골라서 내 톤 확인하기").click();
    await page.getByText("내가 가진 립 색 재기").click();
    await fits("셀프 비교·색 재기를 펼쳐도");
  });
});

test.describe("폰에서 사진 크게 보기", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test("사진을 탭하면 얼굴을 크게 잡아 열리고, 두 번 탭해 전체·확대를 오가고, 아래에서 고른 색이 발라 보기에도 남는다", async ({ page }) => {
    await waitForModel(page);
    await uploadFace(page);
    await page.getByLabel(/카메라 미리보기와 립 컬러 체험/).tap();
    const viewer = page.getByRole("dialog", { name: "사진 크게 보기" });
    await expect(viewer).toBeVisible();
    const stage = page.getByTestId("photo-viewer-stage");
    const box = (await stage.boundingBox())!;
    await expect(viewer.getByText(/배 · 두 번 탭하면 원래 크기/)).toBeVisible();
    await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 3);
    await expect(viewer.getByText("두 손가락으로 확대 · 두 번 탭")).toBeVisible();
    await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 3);
    await expect(viewer.getByText(/2\.5배/)).toBeVisible();
    await viewer.locator('label:has(input[name="viewer-lip"])').nth(2).click();
    const picked = (await viewer.locator("legend span").textContent())!;
    expect(picked).not.toBe("선택 안 함");
    await viewer.getByRole("button", { name: "닫기" }).click();
    await expect(viewer).toBeHidden();
    await toMatch(page);
    await page.getByRole("button", { name: "발라 보기" }).first().click();
    await expect(page.locator("legend span").first()).toBeVisible();
  });
});

test("형광등 아래에서 찍어도 치아 기준으로 조명을 되돌려 자연광과 같은 색으로 읽는다", async ({ page }) => {
  await waitForModel(page);
  const hue = async (file: string) => {
    await uploadFace(page, file);
    await page.getByRole("button", { name: "정확도 높이기" }).click();
    await expect(page.getByText("왜 이렇게 나왔나요")).toBeVisible();
    const details = page.locator("details", { hasText: "측정값 자세히" });
    if (!(await details.getAttribute("open"))) await details.locator("summary").click();
    const text = (await details.locator("p.font-mono").textContent()) ?? "";
    // 치아가 보이는 사진이라 완전 보정 기준이 있고, 그래서 흰색 자동 제안은 띄우지 않는다
    expect(text).toContain("치아 기준");
    await expect(page.getByRole("button", { name: "찾은 흰색으로 맞추기" })).toHaveCount(0);
    return Number(/hue ([\d.]+)°/.exec(text)?.[1]);
  };
  const daylight = await hue("e2e/fixtures/face-paper.jpg");
  await page.getByRole("button", { name: "처음부터" }).click();
  const fluorescent = await hue("e2e/fixtures/face-paper-fluorescent.jpg");
  expect(Math.abs(daylight - fluorescent)).toBeLessThan(2.5);
});
