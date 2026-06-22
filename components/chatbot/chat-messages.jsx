"use client";

import { cn } from "@/lib/utils";
import { ChatMarkdown } from "./chat-markdown";
import { ChatRecommendations } from "./chat-recommendations";
import { TypingIndicator } from "./typing-indicator";

/**
 * @param {object} props
 */
export function ChatMessages({ messages, loading, streaming, dir }) {
  if (messages.length === 0) {
    return null;
  }

  const lastIndex = messages.length - 1;
  const last = messages[lastIndex];
  const showTyping =
    (loading || streaming) &&
    last?.role === "assistant" &&
    !last.content?.trim();

  return (
    <div className="space-y-3">
      {messages.map((m, i) => {
        const isLastAssistant = i === lastIndex && m.role === "assistant";
        const showIndicator = isLastAssistant && showTyping;

        return (
          <div key={m.id ?? i} className="space-y-2">
            <div
              className={cn(
                "max-w-[92%] rounded-xl px-3 py-2 text-sm break-words",
                m.role === "user"
                  ? "ms-auto bg-primary text-primary-foreground whitespace-pre-wrap"
                  : "me-auto bg-muted text-foreground"
              )}
              dir={dir}
            >
              {m.role === "user" ? (
                m.content
              ) : showIndicator ? (
                <TypingIndicator label="" />
              ) : (
                <ChatMarkdown content={m.content} dir={dir} />
              )}
            </div>
            {m.role === "assistant" && (m.recommendations || m.urgency) ? (
              <div className="me-auto max-w-[92%]">
                <ChatRecommendations
                  recommendations={m.recommendations}
                  urgency={m.urgency}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
