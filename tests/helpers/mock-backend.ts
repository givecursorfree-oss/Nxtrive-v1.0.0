import type { Page } from "@playwright/test";

const DEFAULT_PORT = 8742;

export function mockHealthReady(port = DEFAULT_PORT) {
  return {
    status: "ok" as const,
    models: ["llama3", "nomic-embed-text"],
    platform: "Windows",
    port,
  };
}

export function mockOllamaReady() {
  return {
    installed: true,
    running: true,
    models: ["llama3", "nomic-embed-text"],
    required_models: ["llama3", "nomic-embed-text"],
    missing_models: [] as string[],
    ready: true,
    install_url: "https://ollama.com/download/windows",
    platform: "Windows",
    error: null,
  };
}

export async function seedOnboardingComplete(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("nxtrive_onboarding_done", "true");
    localStorage.setItem("nxtrive_welcome_done", "true");
    localStorage.setItem("nxtrive_setup_disclaimer_seen", "true");
    localStorage.setItem(
      "nxtrive_settings",
      JSON.stringify({ topK: 5, sidebarCollapsed: false, theme: "system" }),
    );
  });
}

export async function mockReadyBackend(page: Page, port = DEFAULT_PORT, collections: { name: string; document_count: number }[] = []) {
  const health = mockHealthReady(port);
  const ollama = mockOllamaReady();

  await page.route("**/health", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(health),
    });
  });

  await page.route("**/ollama-status", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(ollama),
    });
  });

  await page.route("**/collections", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ collections }),
    });
  });
}

export const SAMPLE_COLLECTIONS = [
  { name: "nxtrive_docs", document_count: 12 },
  { name: "nxtrive_research", document_count: 8 },
  { name: "nxtrive_legal", document_count: 5 },
  { name: "nxtrive_code", document_count: 22 },
];

export async function enterAppFromWelcome(page: Page) {
  const enterButton = page.getByRole("button", { name: "Enter" });
  await enterButton.waitFor({ state: "visible" });
  await enterButton.click();
}

export async function waitForMainShell(page: Page) {
  await page.getByRole("status", { name: "System status" }).first().waitFor({
    state: "visible",
    timeout: 30_000,
  });
  await page.getByLabel("Document library").waitFor({ state: "attached", timeout: 30_000 });
  await page.getByLabel("Chat message").waitFor({ state: "visible", timeout: 30_000 });
}
