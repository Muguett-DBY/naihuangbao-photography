import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:4173",
    headless: true,
  },
});
