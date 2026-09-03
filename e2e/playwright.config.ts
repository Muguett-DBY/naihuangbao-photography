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
      name: "webgl-studio",
      // V7 Studio 依赖 WebGL 画布 + IndexedDB 工作区；与其它图像密集测试
      // 并行时初始化会被拖慢/超时（WORKER 竞争），独占 1 个 worker 串行执行。
      testMatch: /visual-os-v7\.spec\.ts/,
      workers: 1,
      fullyParallel: false,
      use: { baseURL: process.env.BASE_URL || "http://127.0.0.1:4174", headless: true },
    },
    {
      name: "default",
      testIgnore: /visual-os-v7\.spec\.ts/,
      workers: 2,
      use: { baseURL: process.env.BASE_URL || "http://127.0.0.1:4174", headless: true },
    },
  ],
});
