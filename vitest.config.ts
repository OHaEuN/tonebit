import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  test: {
    include: ["src/**/*.test.ts"],
    // DB 통합 테스트는 같은 테스트 DB의 스키마를 비우고 쓰므로 파일끼리 동시에 돌리지 않는다
    fileParallelism: !process.env.TEST_DATABASE_URL,
  },
});
