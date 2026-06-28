import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { chatMarkdownComponents } from "@/lib/chat-markdown";
import {
  normalizeChatMarkdown,
  prepareStreamingMarkdown,
} from "@/lib/normalize-chat-markdown";

interface ChatMarkdownProps {
  children: string;
  streaming?: boolean;
}

export function ChatMarkdown({ children, streaming = false }: ChatMarkdownProps) {
  const markdown = streaming
    ? prepareStreamingMarkdown(children)
    : normalizeChatMarkdown(children);

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={chatMarkdownComponents}>
      {markdown}
    </ReactMarkdown>
  );
}
