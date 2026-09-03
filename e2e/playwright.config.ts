import { defineConfig } from "@playwright/test";

delete process.env.NO_COLOR;

export default defineConfig({
  testDir: ".",
  timeout: 30000,
  use: {
    baseURL: process.env.BASE_URL || "http://127.0.0.1:4174",
    headless: true,
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
      command: "npm run preview -- --host 127.0.0.1 --port 4174",
      url: "http://127.0.0.1:4174",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  projects: [
    {
      name: "env-sensitive",
      // 环境敏感测试：V7 Studio（WebGL 画布 + IndexedDB）与沉浸画廊惯例测试
      // 在无 GPU 的 CI 容器里初始化/测量远超常规预算，独占 worker + 加长超时 + 重试。
      testMatch: /visual-os-v7\.spec\.ts|immersive-experience\.spec\.ts/,
      workers: 1,
      fullyParallel: false,
      timeout: 180_000,
      retries: 2,
      use: { baseURL: process.env.BASE_URL || "http://127.0.0.1:4174", headless: true },
    },
    {
      name: "default",
      testIgnore: /visual-os-v7\.spec\.ts|immersive-experience\.spec\.ts/,
      workers: 2,
      timeout: 30_000,
      retries: 1,
      use: { baseURL: process.env.BASE_URL || "http://127.0.0.1:4174", headless: true },
    },
  ],
});
