export function SystemVerifyOverlay() {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-deep-ink/25 p-4 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-label="Checking system status"
    >
      <div className="rounded-card border border-mist bg-card-white/95 px-6 py-4 shadow-lg">
        <p className="type-body-sm text-slate">Checking backend and Ollama models…</p>
      </div>
    </div>
  );
}
