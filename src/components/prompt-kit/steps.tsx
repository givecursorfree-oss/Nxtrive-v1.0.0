import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export type StepsItemProps = React.ComponentProps<"div">;

export function StepsItem({ children, className, ...props }: StepsItemProps) {
  return (
    <div className={cn("type-body-sm text-slate", className)} {...props}>
      {children}
    </div>
  );
}

export type StepsTriggerProps = React.ComponentProps<typeof CollapsibleTrigger> & {
  leftIcon?: React.ReactNode;
  swapIconOnHover?: boolean;
};

export function StepsTrigger({
  children,
  className,
  leftIcon,
  swapIconOnHover = true,
  ...props
}: StepsTriggerProps) {
  return (
    <CollapsibleTrigger
      className={cn(
        "group flex w-full cursor-pointer items-center justify-start gap-1 text-sm text-slate transition-colors hover:text-deep-ink",
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 items-center gap-2">
        {leftIcon ? (
          <span className="relative inline-flex size-4 items-center justify-center">
            <span className={cn("transition-opacity", swapIconOnHover && "group-hover:opacity-0")}>
              {leftIcon}
            </span>
            {swapIconOnHover ? (
              <ChevronDown className="absolute size-4 opacity-0 transition-opacity group-hover:opacity-100 group-data-[state=open]:rotate-180" />
            ) : null}
          </span>
        ) : null}
        <span className="min-w-0">{children}</span>
      </div>
      {!leftIcon ? (
        <ChevronDown className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
      ) : null}
    </CollapsibleTrigger>
  );
}

export type StepsContentProps = React.ComponentProps<typeof CollapsibleContent> & {
  bar?: React.ReactNode;
};

export function StepsContent({ children, className, bar, ...props }: StepsContentProps) {
  return (
    <CollapsibleContent
      className={cn("overflow-hidden", className)}
      {...props}
    >
      <div className="mt-3 grid max-w-full min-w-0 grid-cols-[min-content_minmax(0,1fr)] items-start gap-x-3">
        <div className="min-w-0 self-stretch">{bar ?? <StepsBar />}</div>
        <div className="min-w-0 space-y-2">{children}</div>
      </div>
    </CollapsibleContent>
  );
}

export type StepsBarProps = React.HTMLAttributes<HTMLDivElement>;

export function StepsBar({ className, ...props }: StepsBarProps) {
  return (
    <div className={cn("h-full w-0.5 bg-mist", className)} aria-hidden {...props} />
  );
}

export type StepsProps = React.ComponentProps<typeof Collapsible> & {
  defaultOpen?: boolean;
};

export function Steps({ defaultOpen = true, className, ...props }: StepsProps) {
  return <Collapsible className={cn(className)} defaultOpen={defaultOpen} {...props} />;
}
