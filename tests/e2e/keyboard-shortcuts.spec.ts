import { test, expect } from "@playwright/test";
import {
  enterAppFromWelcome,
  mockReadyBackend,
  SAMPLE_COLLECTIONS,
  seedOnboardingComplete,
  waitForMainShell,
} from "../helpers/mock-backend";

test.describe("Keyboard shortcuts modal", () => {
  test.beforeEach(async ({ page }) => {
    await seedOnboardingComplete(page);
    await mockReadyBackend(page);
    await page.goto("/");
    await enterAppFromWelcome(page);
    await waitForMainShell(page);
  });

  test("opens with ? key", async ({ page }) => {
    await page.locator("body").click({ position: { x: 400, y: 400 } });
    await page.keyboard.press("?");
    await expect(page.getByRole("heading", { name: "Keyboard shortcuts" })).toBeVisible();
    await expect(page.getByText("Send message")).toBeVisible();
    await expect(page.getByText("Focus chat input")).toBeVisible();
  });

  test("opens via Shortcuts button", async ({ page }) => {
    await page.getByRole("button", { name: "Keyboard shortcuts" }).click();
    await expect(page.getByRole("heading", { name: "Keyboard shortcuts" })).toBeVisible();
  });

  test("closes with Escape", async ({ page }) => {
    await page.getByRole("button", { name: "Keyboard shortcuts" }).click();
    await expect(page.getByRole("heading", { name: "Keyboard shortcuts" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Keyboard shortcuts" })).toBeHidden();
  });

  test("Ctrl+K focuses chat input when a collection is selected", async ({ page }) => {
    await seedOnboardingComplete(page);
    await mockReadyBackend(page, 8742, [SAMPLE_COLLECTIONS[0]]);
    await page.goto("/");
    await enterAppFromWelcome(page);
    await waitForMainShell(page);
    await page.getByRole("button", { name: /docs/i }).first().click();
    await page.keyboard.press("Control+k");
    await expect(page.getByLabel("Chat message")).toBeFocused();
  });
});
