import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  retries: isCI ? 1 : 0,
  use: { baseURL: "http://localhost:3100", trace: "on-first-retry" },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // 가짜 카메라 장치 + 권한 프롬프트 자동 허용
        launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
      },
    },
  ],
  webServer: {
    command: isCI ? "pnpm build && pnpm start -p 3100" : "pnpm dev -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !isCI,
    timeout: 240_000,
  },
});
