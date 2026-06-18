"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * Lightweight markdown for assistant messages.
 * @param {{ content: string; className?: string; dir?: string }} props
 */
export function ChatMarkdown({ content, className, dir = "ltr" }) {
  if (!content) return null;

  return (
    <div
      dir={dir}
      className={cn(
        "max-w-none text-sm leading-relaxed",
        "[&_p]:my-1 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:ps-4",
        "[&_ol]:my-1 [&_ol]:list-decimal [&_ol]:ps-4",
        "[&_h1]:text-base [&_h2]:text-base [&_h3]:text-sm [&_h1]:font-semibold",
        "[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm",
        "[&_th]:border [&_th]:border-border/60 [&_th]:bg-muted/40 [&_th]:px-3 [&_th]:py-2 [&_th]:text-start [&_th]:font-semibold",
        "[&_td]:border [&_td]:border-border/60 [&_td]:px-3 [&_td]:py-2",
        "[&_a]:text-primary [&_a]:underline",
        "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
