"use client";



import { useEffect, useRef, useState } from "react";

import { X, Bot, AlertCircle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

import { translateActionError } from "@/lib/i18n-errors";

import { ChatMessages } from "./chat-messages";

import { ChatInput } from "./chat-input";

import { ChatUpload } from "./chat-upload";



const PROMPT_KEYS = ["symptoms", "labs", "book", "online", "support"];



/**

 * Panel UI — always mounted so child hook order stays stable when open/closed.

 */

export function ChatPanel({ chat, open, dir, dict, t }) {

  const [input, setInput] = useState("");

  const scrollRef = useRef(null);



  useEffect(() => {

    if (!open || !scrollRef.current) return;

    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;

  }, [chat.messages, open, chat.loading, chat.streaming]);



  const errorMessage = chat.error
    ? chat.error.message ||
      (chat.error.code
        ? translateActionError(dict, { code: chat.error.code }) !==
          `errors.codes.${chat.error.code}`
          ? translateActionError(dict, { code: chat.error.code })
          : null
        : null)
    : null;



  const prompts = PROMPT_KEYS.map((key) => ({

    key,

    label: t(`chatbot.prompts.${key}`),

  }));



  const showEmpty = chat.messages.length === 0 && !chat.loading;

  const panelLocked = !open;



  return (

    <div

      className={cn(

        "fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl",

        "inset-x-3 bottom-[4.75rem] max-h-[min(78vh,560px)] sm:inset-x-auto sm:bottom-24",

        dir === "rtl" ? "sm:start-4 sm:end-auto" : "sm:end-4 sm:start-auto",

        "sm:w-[min(100vw-2rem,400px)]",

        panelLocked && "pointer-events-none invisible"

      )}

      role="dialog"

      aria-label={t("chatbot.title")}

      aria-hidden={panelLocked}

    >

      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-3">

        <div className="flex min-w-0 items-center gap-2">

          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">

            <Bot className="h-5 w-5" />

          </div>

          <div className="min-w-0">

            <p className="truncate text-sm font-semibold">{t("chatbot.title")}</p>

            <p className="truncate text-xs text-muted-foreground">

              {t("chatbot.subtitle")}

            </p>

          </div>

        </div>

        <Button

          type="button"

          variant="ghost"

          size="icon"

          className="size-8 shrink-0"

          onClick={() => chat.setOpen(false)}

          aria-label={t("chatbot.minimize")}

          tabIndex={open ? 0 : -1}

        >

          <X className="h-4 w-4" />

        </Button>

      </div>



      <p className="border-b border-border bg-amber-500/10 px-3 py-2 text-[0.7rem] leading-snug text-muted-foreground">

        {t("chatbot.disclaimer")}

      </p>



      {chat.providerInfo?.fallbackUsed ? (

        <div className="border-b border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">

          {t("chatbot.providerFallback", {

            requested: chat.providerInfo.requested,

            active: chat.providerInfo.active,

          })}

        </div>

      ) : null}



      <div

        ref={scrollRef}

        className="flex-1 space-y-3 overflow-y-auto overflow-x-hidden p-3"

      >

        {showEmpty ? (

          <div className="space-y-2">

            <p className="text-xs text-muted-foreground">{t("chatbot.emptyHint")}</p>

            <div className="flex flex-wrap gap-1.5">

              {prompts.map((p) => (

                <button

                  key={p.key}

                  type="button"

                  className="max-w-full break-words rounded-full border border-border bg-muted/50 px-2.5 py-1 text-start text-xs transition-colors hover:bg-muted"

                  onClick={() => chat.sendMessage(p.label)}

                  disabled={chat.sendDisabled}

                  tabIndex={open ? 0 : -1}

                >

                  {p.label}

                </button>

              ))}

            </div>

          </div>

        ) : null}



        <ChatMessages

          messages={chat.messages}

          loading={chat.loading}

          streaming={chat.streaming}

          dir={dir}

        />



        {errorMessage ? (

          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs">

            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />

            <div className="min-w-0 flex-1">

              <p className="text-destructive">{errorMessage}</p>

              {chat.cooldownSecondsLeft > 0 ? (
                <p className="mt-1 text-muted-foreground">
                  {t("chatbot.rateLimitCountdown", {
                    seconds: chat.cooldownSecondsLeft,
                  })}
                </p>
              ) : null}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-1 h-7 px-2"
                onClick={chat.retry}
                disabled={chat.cooldownSecondsLeft > 0 || chat.sendDisabled}
                tabIndex={open ? 0 : -1}
              >

                <RotateCcw className="me-1 h-3 w-3" />

                {t("chatbot.retry")}

              </Button>

            </div>

          </div>

        ) : null}

      </div>



      <ChatUpload

        pendingFiles={chat.pendingFiles}

        onUploadFile={(file) => chat.uploadFile(file, false)}

        onUploadUrl={(url) => chat.uploadFile(url, true)}

        onRemovePending={(id) =>

          chat.setPendingFiles((prev) => prev.filter((f) => f.id !== id))

        }

        loading={chat.loading}

        disabled={panelLocked}

      />



      <ChatInput

        value={input}

        onChange={setInput}

        onSubmit={() => {
          if (chat.sendDisabled) return;
          chat.sendMessage(input);
          setInput("");
        }}

        onCancel={chat.cancel}

        loading={chat.loading}

        streaming={chat.streaming}

        disabled={panelLocked || chat.sendDisabled}

        cooldownSecondsLeft={chat.cooldownSecondsLeft}

      />

    </div>

  );

}


