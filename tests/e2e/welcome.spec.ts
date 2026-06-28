import { test, expect } from "@playwright/test";

test.describe("Welcome screen", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("shows welcome dialog with brand and Enter button", async ({ page }) => {
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("button", { name: "Enter" })).toBeVisible();
    await expect(page.locator("#welcome-brand-title img")).toBeVisible();
  });

  test("Enter button dismisses welcome screen", async ({ page }) => {
    await page.getByRole("button", { name: "Enter" }).click();
    await expect(page.getByRole("button", { name: "Enter" })).toBeHidden({
      timeout: 15_000,
    });
  });

  test("Enter key dismisses welcome screen", async ({ page }) => {
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Enter" })).toBeHidden({
      timeout: 15_000,
    });
  });

  test("page title is Nxtrive", async ({ page }) => {
    await expect(page).toHaveTitle(/Nxtrive/i);
  });
});
