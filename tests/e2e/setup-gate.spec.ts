import { test, expect, type APIRequestContext } from "@playwright/test";
import { enterAppFromWelcome } from "../helpers/mock-backend";

const backendURL = process.env.PLAYWRIGHT_BACKEND_URL ?? "http://127.0.0.1:8742";

async function isBackendLive(request: APIRequestContext): Promise<boolean> {
  try {
    const response = await request.get(`${backendURL}/health`, { timeout: 5_000 });
    return response.ok();
  } catch {
    return false;
  }
}

test.describe("Ollama setup gate (live backend) @live", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await enterAppFromWelcome(page);
  });

  test("shows setup gate or main shell after welcome", async ({ page }) => {
    const setupGate = page.getByRole("dialog").filter({ hasText: /ollama|model|setup/i });
    const mainShell = page.getByRole("status", { name: "System status" });

    await expect(setupGate.or(mainShell).first()).toBeVisible({ timeout: 30_000 });
  });

  test("live backend health endpoint responds", async ({ request }) => {
    test.skip(!(await isBackendLive(request)), `Requires live backend at ${backendURL}`);
    const response = await request.get(`${backendURL}/health`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.port).toBe(8742);
  });

  test("live ollama status reports install state", async ({ request }) => {
    test.skip(!(await isBackendLive(request)), `Requires live backend at ${backendURL}`);
    test.setTimeout(120_000);
    const response = await request.get(`${backendURL}/ollama-status`, {
      timeout: 90_000,
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.installed).toBe(true);
    expect(body.running).toBe(true);
    expect(Array.isArray(body.required_models)).toBe(true);
  });
});
