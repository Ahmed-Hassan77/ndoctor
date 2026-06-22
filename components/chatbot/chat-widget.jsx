"use client";

import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/locale-provider";
import { useChatbot } from "./use-chatbot";
import { ChatPanel } from "./chat-panel";

export function ShifaaChatbot() {
  const { t, dict, dir, locale } = useLocale();
  const chat = useChatbot(locale);

  return (
    <>
      <ChatPanel
        chat={chat}
        open={chat.open}
        dir={dir}
        dict={dict}
        t={t}
      />

      <Button
        type="button"
        size="icon"
        className={cn(
          "fixed bottom-4 z-50 size-14 rounded-full shadow-lg",
          dir === "rtl" ? "start-4" : "end-4",
          "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
        onClick={() => chat.setOpen((o) => !o)}
        aria-label={chat.open ? t("chatbot.minimize") : t("chatbot.open")}
        aria-expanded={chat.open}
      >
        {chat.open ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </Button>
    </>
  );
}
