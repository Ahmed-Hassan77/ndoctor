"use client";

import { useLocale } from "@/components/locale-provider";

/**
 * @param {{ label?: string }} props
 */
export function TypingIndicator({ label }) {
  const { t } = useLocale();
  const text = label ?? t("chatbot.typing");

  return (
    <span className="inline-flex items-center gap-2 text-muted-foreground">
      <span className="flex gap-1" aria-hidden>
        <span className="size-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:0ms]" />
        <span className="size-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:150ms]" />
        <span className="size-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:300ms]" />
      </span>
      <span className="text-xs">{text}</span>
    </span>
  );
}
