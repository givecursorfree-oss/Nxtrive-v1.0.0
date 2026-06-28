const OLLAMA_DOWNLOAD_URLS = {
  windows: "https://ollama.com/download/windows",
  macos: "https://ollama.com/download/mac",
  linux: "https://ollama.com/download/linux",
};

const OLLAMA_FALLBACK_URL = "https://ollama.com/download";

function resolveInstallUrl(os, backendUrl) {
  if (os === "windows") return OLLAMA_DOWNLOAD_URLS.windows;
  if (os === "macos") return OLLAMA_DOWNLOAD_URLS.macos;
  if (os === "linux") return OLLAMA_DOWNLOAD_URLS.linux;
  return backendUrl ?? OLLAMA_FALLBACK_URL;
}

const platforms = ["windows", "macos", "linux", "unknown"];
let failed = 0;

for (const os of platforms) {
  const url = resolveInstallUrl(os);
  const expected =
    os === "windows"
      ? OLLAMA_DOWNLOAD_URLS.windows
      : os === "macos"
        ? OLLAMA_DOWNLOAD_URLS.macos
        : os === "linux"
          ? OLLAMA_DOWNLOAD_URLS.linux
          : OLLAMA_FALLBACK_URL;

  if (url !== expected) {
    console.error(`FAIL ${os}: expected ${expected}, got ${url}`);
    failed += 1;
  } else {
    console.log(`OK   ${os} -> ${url}`);
  }
}

const backendFallback = resolveInstallUrl("unknown", "https://ollama.com/download/windows");
if (backendFallback !== "https://ollama.com/download/windows") {
  console.error("FAIL unknown+backend fallback");
  failed += 1;
} else {
  console.log("OK   unknown uses backend fallback when provided");
}

if (failed > 0) process.exit(1);

console.log(`\nAll ${platforms.length + 1} cross-platform install URL checks passed.`);
