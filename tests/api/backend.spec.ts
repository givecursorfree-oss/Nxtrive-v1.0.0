import { test, expect } from "@playwright/test";

const BACKEND = process.env.PLAYWRIGHT_BACKEND_URL ?? "http://127.0.0.1:8742";

test.describe("Backend API (integration)", () => {
  test("GET /health returns ok status", async ({ request }) => {
    const response = await request.get(`${BACKEND}/health`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.platform).toBeTruthy();
    expect(body.data_dir).toBeTruthy();
    expect(typeof body.port).toBe("number");
  });

  test("GET /ollama-status returns structured status", async ({ request }) => {
    const response = await request.get(`${BACKEND}/ollama-status`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(typeof body.installed).toBe("boolean");
    expect(typeof body.running).toBe("boolean");
    expect(typeof body.ready).toBe("boolean");
    expect(body.required_models).toContain("llama3");
    expect(body.required_models).toContain("nomic-embed-text");
  });

  test("GET /collections returns collections array", async ({ request }) => {
    const response = await request.get(`${BACKEND}/collections`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body.collections)).toBe(true);
  });

  test("GET /source-preview without params returns 422", async ({ request }) => {
    const response = await request.get(`${BACKEND}/source-preview`);
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("POST /chat without body returns 422", async ({ request }) => {
    const response = await request.post(`${BACKEND}/chat`, {
      headers: { "Content-Type": "application/json" },
      data: {},
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("POST /ingest with invalid folder streams error event", async ({ request }) => {
    const response = await request.post(`${BACKEND}/ingest`, {
      headers: { "Content-Type": "application/json" },
      data: { folder_path: "C:\\nonexistent-path-xyz-12345", collection_name: "test-invalid" },
    });
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toMatch(/error/i);
  });

  test("DELETE unknown collection source returns 404 or 422", async ({ request }) => {
    const response = await request.delete(`${BACKEND}/collection/nonexistent_xyz/sources`, {
      headers: { "Content-Type": "application/json" },
      data: { source_path: "fake.pdf" },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("health response includes CORS-safe JSON content type", async ({ request }) => {
    const response = await request.get(`${BACKEND}/health`);
    expect(response.headers()["content-type"]).toContain("application/json");
  });
});
