export function AppShellFallback() {
  return (
    <div className="flex min-h-0 flex-1 animate-pulse">
      <div className="hidden w-[300px] shrink-0 border-r border-mist surface-glass md:block" />
      <div className="flex min-w-0 flex-1 flex-col surface-glass">
        <div className="flex-1" />
        <div className="h-28 border-t border-mist bg-paper-white/50" />
      </div>
    </div>
  );
}
