export function OnboardingLoadingShell() {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#050507]"
      role="status"
      aria-live="polite"
      aria-label="Loading welcome screen"
    >
      <div className="mx-auto h-10 w-56 animate-pulse rounded-lg bg-white/10" />
      <p className="sr-only">Loading welcome screen…</p>
    </div>
  );
}
