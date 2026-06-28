import { test, expect } from "@playwright/test";
import {
  enterAppFromWelcome,
  mockReadyBackend,
  seedOnboardingComplete,
  waitForMainShell,
} from "../helpers/mock-backend";

test.describe("Settings panel", () => {
  test.beforeEach(async ({ page }) => {
    await seedOnboardingComplete(page);
    await mockReadyBackend(page);
    await page.goto("/");
    await enterAppFromWelcome(page);
    await waitForMainShell(page);
  });

  test("opens via Ctrl+, keyboard shortcut", async ({ page }) => {
    await page.locator("body").click({ position: { x: 400, y: 400 } });
    await page.keyboard.press("Control+Comma");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });

  test("opens via Settings button in status bar", async ({ page }) => {
    await page.getByRole("button", { name: "Settings" }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });

  test("theme radiogroup has Light, Dark, and System options", async ({ page }) => {
    await page.keyboard.press("Control+Comma");
    const themeGroup = page.getByRole("radiogroup", { name: "Theme" });
    await expect(themeGroup).toBeVisible();
    await expect(page.getByRole("radio", { name: "Light" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Dark" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "System" })).toBeVisible();
  });

  test("Top-K retrieval slider is adjustable", async ({ page }) => {
    await page.getByRole("button", { name: "Settings" }).click();
    await expect(page.getByText(/Sources per answer/i)).toBeVisible();
    const slider = page.locator("#top-k");
    await expect(slider).toBeVisible();
    await slider.fill("8");
    await expect(slider).toHaveValue("8");
  });

  test("closes with Escape key", async ({ page }) => {
    await page.keyboard.press("Control+Comma");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeHidden();
  });

  test("shows supported file formats section", async ({ page }) => {
    await page.getByRole("button", { name: "Settings" }).click();
    await expect(page.getByText(/Supported formats/i)).toBeVisible();
    await expect(page.getByText(/PDF/i).first()).toBeVisible();
  });
});
