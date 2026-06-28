import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";
import { codeToHtml } from "shiki";

import { resolveTheme } from "@/lib/theme";
import { useSettingsStore } from "@/store/useSettingsStore";

export type CodeBlockProps = {
  children?: React.ReactNode;
  className?: string;
} & React.HTMLProps<HTMLDivElement>;

function CodeBlock({ children, className, ...props }: CodeBlockProps) {
  return (
    <div
      className={cn(
        "not-prose my-3 flex w-full flex-col overflow-hidden rounded-card border border-mist bg-paper-white",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type CodeBlockCodeProps = {
  code: string;
  language?: string;
  className?: string;
} & React.HTMLProps<HTMLDivElement>;

function CodeBlockCode({
  code,
  language = "text",
  className,
  ...props
}: CodeBlockCodeProps) {
  const themeSetting = useSettingsStore((s) => s.theme);
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
  const shikiTheme =
    resolveTheme(themeSetting) === "dark" ? "github-dark" : "github-light";

  useEffect(() => {
    let active = true;

    async function highlight() {
      if (!code) {
        if (active) setHighlightedHtml("<pre><code></code></pre>");
        return;
      }

      try {
        const html = await codeToHtml(code, { lang: language, theme: shikiTheme });
        if (active) setHighlightedHtml(html);
      } catch {
        if (active) setHighlightedHtml(null);
      }
    }

    void highlight();
    return () => {
      active = false;
    };
  }, [code, language, shikiTheme]);

  const classNames = cn(
    "w-full overflow-x-auto text-[13px] [&>pre]:px-4 [&>pre]:py-4 [&>pre]:m-0",
    className,
  );

  if (highlightedHtml) {
    return (
      <div
        className={classNames}
        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        {...props}
      />
    );
  }

  return (
    <div className={classNames} {...props}>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

export { CodeBlock, CodeBlockCode };
