"use client";

import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/components/locale-provider";

/**
 * @param {object} props
 */
export function ChatInput({
  value,
  onChange,
  onSubmit,
  onCancel,
  loading,
  streaming,
  disabled,
  cooldownSecondsLeft = 0,
}) {
  const { t } = useLocale();

  const inputLocked = disabled || loading || streaming || cooldownSecondsLeft > 0;
  const placeholder =
    cooldownSecondsLeft > 0
      ? t("chatbot.rateLimitCountdown", { seconds: cooldownSecondsLeft })
      : t("chatbot.placeholder");

  return (
    <form
      className="flex gap-2 border-t border-border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (inputLocked) return;
        onSubmit();
      }}
    >
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={1}
        disabled={inputLocked}
        className="min-h-9 max-h-24 resize-none text-sm"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (inputLocked) return;
            onSubmit();
          }
        }}
      />
      {streaming ? (
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-9 shrink-0"
          onClick={onCancel}
          aria-label={t("chatbot.cancel")}
        >
          <Square className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          type="submit"
          size="icon"
          className="size-9 shrink-0"
          disabled={inputLocked}
        >
          <Send className="h-4 w-4" />
          <span className="sr-only">{t("chatbot.send")}</span>
        </Button>
      )}
    </form>
  );
}
