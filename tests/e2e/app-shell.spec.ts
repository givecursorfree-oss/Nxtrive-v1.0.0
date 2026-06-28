import { test, expect } from "@playwright/test";
import {
  enterAppFromWelcome,
  mockReadyBackend,
  SAMPLE_COLLECTIONS,
  seedOnboardingComplete,
  waitForMainShell,
} from "../helpers/mock-backend";

test.describe("Main app shell", () => {
  test.beforeEach(async ({ page }) => {
    await seedOnboardingComplete(page);
    await mockReadyBackend(page);
    await page.goto("/");
    await enterAppFromWelcome(page);
    await waitForMainShell(page);
  });

  test("renders status bar, sidebar, and chat composer", async ({ page }) => {
    await expect(page.getByRole("status", { name: "System status" }).first()).toBeVisible();
    await expect(page.getByLabel("Document library")).toBeAttached();
    await expect(page.getByLabel("Message composer")).toBeVisible();
    await expect(page.getByLabel("Chat message")).toBeVisible();
  });

  test("shows empty state when no collections exist", async ({ page }) => {
    await expect(page.getByText(/Index a folder/i).first()).toBeVisible();
    await expect(page.getByText(/Select a collection/i).first()).toBeVisible();
  });

  test("skip-to-chat link is focusable", async ({ page }) => {
    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: "Skip to chat" });
    await expect(skipLink).toBeFocused();
  });

  test("shows no collections message when library is empty", async ({ page }) => {
    await expect(page.getByText("No collections yet")).toBeVisible();
  });
});

test.describe("Main app shell with collections", () => {
  test("sidebar search appears when more than 3 collections exist", async ({ page }) => {
    await seedOnboardingComplete(page);
    await mockReadyBackend(page, 8742, SAMPLE_COLLECTIONS);
    await page.goto("/");
    await enterAppFromWelcome(page);
    await waitForMainShell(page);
    await expect(page.getByLabel("Search collections")).toBeVisible({ timeout: 15_000 });
  });
});
