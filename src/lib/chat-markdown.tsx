import type { Components } from "react-markdown";

import { CodeBlock, CodeBlockCode } from "@/components/prompt-kit/code-block";

export const chatMarkdownComponents: Components = {
  h2({ children }) {
    return (
      <h2 className="mb-2 mt-4 type-body font-semibold text-deep-ink first:mt-0">{children}</h2>
    );
  },
  h3({ children }) {
    return <h3 className="mb-1.5 mt-3 type-body-sm font-semibold text-deep-ink">{children}</h3>;
  },
  p({ children }) {
    return <p className="mb-3 type-body leading-relaxed text-carbon last:mb-0">{children}</p>;
  },
  strong({ children }) {
    return <strong className="font-semibold text-deep-ink">{children}</strong>;
  },
  em({ children }) {
    return <em className="text-carbon">{children}</em>;
  },
  ul({ children }) {
    return <ul className="mb-3 list-disc space-y-1.5 pl-5 type-body text-carbon">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="mb-3 list-decimal space-y-1.5 pl-5 type-body text-carbon">{children}</ol>;
  },
  li({ children }) {
    return <li className="leading-relaxed">{children}</li>;
  },
  blockquote({ children }) {
    return (
      <blockquote className="mb-3 border-l-2 border-forest-teal/40 pl-3 text-slate">
        {children}
      </blockquote>
    );
  },
  hr() {
    return <hr className="my-4 border-mist" />;
  },
  table({ children }) {
    return (
      <div className="prose-chat-table-wrap my-4 w-full overflow-x-auto rounded-card border border-mist bg-card-white/50">
        <table className="prose-chat-table w-full min-w-[20rem] border-collapse text-left">
          {children}
        </table>
      </div>
    );
  },
  thead({ children }) {
    return <thead className="prose-chat-table__head">{children}</thead>;
  },
  tbody({ children }) {
    return <tbody className="prose-chat-table__body">{children}</tbody>;
  },
  tr({ children }) {
    return <tr className="prose-chat-table__row">{children}</tr>;
  },
  th({ children }) {
    return <th className="prose-chat-table__th">{children}</th>;
  },
  td({ children }) {
    return <td className="prose-chat-table__td">{children}</td>;
  },
  code({ className, children }) {
    const text = String(children).replace(/\n$/, "");
    const match = /language-(\w+)/.exec(className ?? "");

    if (!match) {
      return (
        <code className="rounded bg-paper-white px-1.5 py-0.5 font-mono text-[0.9em] text-deep-indigo">
          {children}
        </code>
      );
    }

    return (
      <CodeBlock>
        <CodeBlockCode code={text} language={match[1]} />
      </CodeBlock>
    );
  },
};
