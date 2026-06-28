import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  enterAppFromWelcome,
  mockReadyBackend,
  seedOnboardingComplete,
  waitForMainShell,
} from "../helpers/mock-backend";

test.describe.configure({ mode: "serial" });

test.describe("Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await seedOnboardingComplete(page);
    await mockReadyBackend(page);
    await page.goto("/");
    await enterAppFromWelcome(page);
    await waitForMainShell(page);
  });

  test("main shell passes WCAG AA axe scan", async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .include("#root")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();

    const blocking = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(
      blocking,
      blocking.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`).join("\n"),
    ).toEqual([]);
  });

  test("chat region has a page heading for screen readers", async ({ page }) => {
    await expect(page.locator("#main-chat h1")).toHaveCount(1);
  });
});
