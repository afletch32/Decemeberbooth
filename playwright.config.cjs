const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./browser",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4321",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "PORT=4321 HOST=127.0.0.1 node server.js",
    url: "http://127.0.0.1:4321",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
