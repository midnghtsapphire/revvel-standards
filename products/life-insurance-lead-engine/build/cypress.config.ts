import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || "http://localhost:3000",
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.{ts,tsx,js,jsx}",
    video: false,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 800,
    setupNodeEvents(on, config) {
      // Applitools eyes-cypress is wired in support/e2e.ts via `import` —
      // no additional setup needed here. If APPLITOOLS_API_KEY is not set,
      // eyes calls become no-ops (the SDK handles it gracefully).
      return config;
    },
  },
});
