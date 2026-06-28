import { test, expect } from "@playwright/test";

test.describe("Desktop-only guard", () => {
  test("blocks viewports narrower than 1024px in browser mode", async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Desktop only" })).toBeVisible();
    await expect(page.getByText(/at least 1024px wide/i)).toBeVisible();
  });

  test("allows desktop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Desktop only" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Enter" })).toBeVisible({ timeout: 15_000 });
  });
});
