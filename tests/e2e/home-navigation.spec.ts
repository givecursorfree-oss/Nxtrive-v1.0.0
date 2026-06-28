import { test, expect } from "@playwright/test";
import {
  enterAppFromWelcome,
  mockReadyBackend,
  seedOnboardingComplete,
  waitForMainShell,
} from "../helpers/mock-backend";

test.describe.configure({ mode: "serial" });

test.describe("Home navigation", () => {
  test.beforeEach(async ({ page }) => {
    await seedOnboardingComplete(page);
    await mockReadyBackend(page);
    await page.goto("/");
    await enterAppFromWelcome(page);
    await waitForMainShell(page);
  });

  test("Home button returns from Settings to chat", async ({ page }) => {
    await page.keyboard.press("Control+Comma");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    await page.getByRole("button", { name: "Home", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeHidden();
  });

  test("logo button returns from Settings to chat", async ({ page }) => {
    await page.keyboard.press("Control+Comma");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    await page.getByRole("button", { name: "Go home" }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeHidden();
  });

  test("breadcrumb brand link returns from settings panel", async ({ page }) => {
    await page.keyboard.press("Control+Comma");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    await page
      .getByRole("navigation", { name: "Breadcrumb" })
      .getByRole("button")
      .click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeHidden();
  });

  test("Ctrl+Shift+H goes home from settings", async ({ page }) => {
    await page.keyboard.press("Control+Comma");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    await page.keyboard.press("Control+Shift+H");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeHidden();
  });

  test("Escape closes shortcuts and returns home", async ({ page }) => {
    await page.getByRole("button", { name: "Shortcuts" }).click();
    await expect(page.getByRole("heading", { name: "Keyboard shortcuts" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Keyboard shortcuts" })).toBeHidden();
  });
});
