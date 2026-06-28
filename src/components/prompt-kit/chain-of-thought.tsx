import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ChevronDown, Circle } from "lucide-react";
import React from "react";

export type ChainOfThoughtItemProps = React.ComponentProps<"div">;

export function ChainOfThoughtItem({ children, className, ...props }: ChainOfThoughtItemProps) {
  return (
    <div className={cn("type-body-sm text-slate", className)} {...props}>
      {children}
    </div>
  );
}

export type ChainOfThoughtTriggerProps = React.ComponentProps<typeof CollapsibleTrigger> & {
  leftIcon?: React.ReactNode;
  swapIconOnHover?: boolean;
};

export function ChainOfThoughtTrigger({
  children,
  className,
  leftIcon,
  swapIconOnHover = true,
  ...props
}: ChainOfThoughtTriggerProps) {
  return (
    <CollapsibleTrigger
      className={cn(
        "group flex w-full cursor-pointer items-center justify-start gap-1 text-left text-sm text-slate transition-colors hover:text-deep-ink",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        {leftIcon ? (
          <span className="relative inline-flex size-4 items-center justify-center">
            <span className={cn("transition-opacity", swapIconOnHover && "group-hover:opacity-0")}>
              {leftIcon}
            </span>
            {swapIconOnHover ? (
              <ChevronDown className="absolute size-4 opacity-0 transition-opacity group-hover:opacity-100 group-data-[state=open]:rotate-180" />
            ) : null}
          </span>
        ) : (
          <span className="relative inline-flex size-4 items-center justify-center">
            <Circle className="size-2 fill-current" />
          </span>
        )}
        <span>{children}</span>
      </div>
      {!leftIcon ? (
        <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
      ) : null}
    </CollapsibleTrigger>
  );
}

export type ChainOfThoughtContentProps = React.ComponentProps<typeof CollapsibleContent>;

export function ChainOfThoughtContent({ children, className, ...props }: ChainOfThoughtContentProps) {
  return (
    <CollapsibleContent className={cn("w-full overflow-hidden", className)} {...props}>
      <div className="mt-2 w-full min-w-0 border-l-2 border-forest-teal/25 pl-4">
        <div className="w-full min-w-0 space-y-2">{children}</div>
      </div>
    </CollapsibleContent>
  );
}

export type ChainOfThoughtProps = {
  children: React.ReactNode;
  className?: string;
};

export function ChainOfThought({ children, className }: ChainOfThoughtProps) {
  const childrenArray = React.Children.toArray(children);

  return (
    <div className={cn("space-y-0", className)}>
      {childrenArray.map((child, index) => (
        <React.Fragment key={index}>
          {React.isValidElement(child)
            ? React.cloneElement(child as React.ReactElement<ChainOfThoughtStepProps>, {
                isLast: index === childrenArray.length - 1,
              })
            : child}
        </React.Fragment>
      ))}
    </div>
  );
}

export type ChainOfThoughtStepProps = {
  children: React.ReactNode;
  className?: string;
  isLast?: boolean;
};

export function ChainOfThoughtStep({
  children,
  className,
  isLast = false,
  ...props
}: ChainOfThoughtStepProps & React.ComponentProps<typeof Collapsible>) {
  return (
    <Collapsible className={cn("group", className)} data-last={isLast} {...props}>
      {children}
      <div className="flex justify-start group-data-[last=true]:hidden">
        <div className="ml-1.5 h-4 w-px bg-forest-teal/25" />
      </div>
    </Collapsible>
  );
}
