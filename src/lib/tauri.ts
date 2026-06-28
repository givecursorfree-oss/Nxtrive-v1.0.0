/** True when running inside the Nxtrive / Tauri desktop shell. */
export function isTauriApp(): boolean {
  if (typeof window === "undefined") return false;

  const globalScope = globalThis as {
    isTauri?: boolean;
    __TAURI__?: unknown;
    __TAURI_INTERNALS__?: unknown;
  };

  return Boolean(
    globalScope.isTauri ||
      globalScope.__TAURI_INTERNALS__ ||
      globalScope.__TAURI__,
  );
}
