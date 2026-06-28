export function DotMapBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="app-rainbow-bg absolute inset-0" />
      <div className="dot-map absolute -right-16 top-0 h-[280px] w-[280px] opacity-[0.08] dark:opacity-[0.04]" />
      <div className="dot-map absolute bottom-0 left-0 h-[200px] w-[200px] opacity-[0.06] dark:opacity-[0.03]" />
    </div>
  );
}
