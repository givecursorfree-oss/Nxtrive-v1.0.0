import { ChevronRightIcon } from "@heroicons/react/24/outline";
import type { BreadcrumbItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface AppBreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  onNavigate?: (id: string) => void;
}

export function AppBreadcrumb({ items, className, onNavigate }: AppBreadcrumbProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex min-w-0 flex-wrap items-center gap-1 type-caption">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isCurrent = item.current ?? isLast;

          return (
            <li key={item.id} className="inline-flex min-w-0 items-center gap-1">
              {index > 0 && (
                <ChevronRightIcon
                  className="h-5 w-5 shrink-0 text-helper"
                  aria-hidden="true"
                />
              )}
              {item.href && !isCurrent ? (
                <a
                  href={item.href}
                  title={item.label}
                  className="truncate text-slate transition-colors hover:text-deep-ink"
                >
                  {item.label}
                </a>
              ) : item.navigable && onNavigate && !isCurrent ? (
                <button
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  title={item.label}
                  className="truncate text-slate transition-colors hover:text-deep-ink"
                >
                  {item.label}
                </button>
              ) : (
                <span
                  className={cn(
                    "truncate",
                    isCurrent ? "font-medium text-deep-ink" : "text-slate"
                  )}
                  title={item.label}
                  aria-current={isCurrent ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
