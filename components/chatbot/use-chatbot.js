"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const GUEST_KEY = "shifaa_chat_guest";
const DEFAULT_RATE_LIMIT_COOLDOWN_SEC = 40;

function readGuestSessionId() {
  if (typeof window === "undefined") return null;
  let id = localStorage.getItem(GUEST_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(GUEST_KEY, id);
  }
  return id;
}

/**
 * @typedef {object} ChatMessage
 * @property {string} [id]
 * @property {'user' | 'assistant'} role
 * @property {string} content
 * @property {string} [urgency]
 * @property {object} [recommendations]
 */

/**
 * @typedef {object} ChatError
 * @property {string} [code]
 * @property {string} [message]
 * @property {number} [retryAfterSeconds]
 */

export function useChatbot(locale) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(/** @type {ChatMessage[]} */ ([]));
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(/** @type {ChatError | null} */ (null));
  const [disabled, setDisabled] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [guestSessionId] = useState(readGuestSessionId);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [providerInfo, setProviderInfo] = useState(null);
  const [cooldownUntil, setCooldownUntil] = useState(/** @type {number | null} */ (null));
  const [cooldownSecondsLeft, setCooldownSecondsLeft] = useState(0);
  const abortRef = useRef(null);
  const sendInFlightRef = useRef(false);
  const cooldownUntilRef = useRef(/** @type {number | null} */ (null));

  useEffect(() => {
    let cancelled = false;
    fetch("/api/chatbot?status=1")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.provider) {
          setProviderInfo(data.provider);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!cooldownUntil) {
      cooldownUntilRef.current = null;
      setCooldownSecondsLeft(0);
      return;
    }

    cooldownUntilRef.current = cooldownUntil;

    const tick = () => {
      const left = Math.ceil((cooldownUntil - Date.now()) / 1000);
      if (left <= 0) {
        setCooldownUntil(null);
        setCooldownSecondsLeft(0);
        cooldownUntilRef.current = null;
      } else {
        setCooldownSecondsLeft(left);
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const removeEmptyAssistantBubble = useCallback((prev) => {
    const last = prev[prev.length - 1];
    if (last?.role === "assistant" && !last.content?.trim()) {
      return prev.slice(0, -1);
    }
    return prev;
  }, []);

  const applyChatError = useCallback(
    (/** @type {ChatError | undefined | null} */ apiErr) => {
      if (apiErr?.code === "AI_PROVIDER_RATE_LIMIT") {
        const secs = apiErr.retryAfterSeconds ?? DEFAULT_RATE_LIMIT_COOLDOWN_SEC;
        setCooldownUntil(Date.now() + secs * 1000);
      }

      setError({
        code: apiErr?.code || "CHATBOT_FAILED",
        message: apiErr?.message,
        retryAfterSeconds: apiErr?.retryAfterSeconds,
      });

      setMessages((prev) => removeEmptyAssistantBubble(prev));
    },
    [removeEmptyAssistantBubble]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    setLoading(false);
    sendInFlightRef.current = false;
  }, []);

  const uploadFile = useCallback(
    async (fileOrUrl, isUrl = false) => {
      if (loading || streaming || sendInFlightRef.current) return null;

      setError(null);
      setLoading(true);
      try {
        const formData = new FormData();
        formData.append("locale", locale);
        if (guestSessionId) formData.append("guestSessionId", guestSessionId);
        if (conversationId) formData.append("conversationId", conversationId);

        if (isUrl) {
          formData.append("fileUrl", fileOrUrl);
        } else {
          formData.append("file", fileOrUrl);
        }

        const res = await fetch("/api/chatbot", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error?.code || "UPLOAD_FAILED");
        }
        if (data.conversationId) setConversationId(data.conversationId);
        setPendingFiles((prev) => [...prev, data.file]);
        return data.file;
      } catch (err) {
        setError({
          code: err instanceof Error ? err.message : "UPLOAD_FAILED",
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [locale, guestSessionId, conversationId, loading, streaming]
  );

  const sendMessage = useCallback(
    async (text, { useStream = true } = {}) => {
      if (sendInFlightRef.current || loading || streaming) return;

      if (cooldownUntilRef.current && Date.now() < cooldownUntilRef.current) {
        return;
      }

      const trimmed = text?.trim();
      const attachmentIds = pendingFiles.map((f) => f.id);
      if (!trimmed && attachmentIds.length === 0) return;

      sendInFlightRef.current = true;
      setError(null);
      setLoading(true);
      setStreaming(useStream);
      setMessages((prev) => [
        ...prev,
        { role: "user", content: trimmed || "[attachment]" },
      ]);
      setPendingFiles([]);

      const controller = new AbortController();
      abortRef.current = controller;

      const payload = {
        message: trimmed,
        locale,
        conversationId,
        guestSessionId,
        attachmentIds,
        stream: useStream,
      };

      try {
        if (useStream) {
          const res = await fetch("/api/chatbot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });

          if (!res.ok || !res.body) {
            const errData = await res.json().catch(() => ({}));
            applyChatError(errData.error);
            return;
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let assistantText = "";
          let meta = null;
          let streamFailed = false;

          setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

          let buffer = "";
          outer: while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data:")) continue;
              const raw = line.slice(5).trim();
              if (raw === "[DONE]") continue;

              let event;
              try {
                event = JSON.parse(raw);
              } catch {
                continue;
              }

              if (event.type === "delta" && event.text) {
                assistantText += event.text;
                setMessages((prev) => {
                  const next = [...prev];
                  next[next.length - 1] = {
                    role: "assistant",
                    content: assistantText,
                  };
                  return next;
                });
              } else if (event.type === "done") {
                meta = event;
              } else if (event.type === "error") {
                streamFailed = true;
                applyChatError(event.error);
                break outer;
              }
            }
          }

          if (streamFailed) return;

          if (meta?.conversationId) setConversationId(meta.conversationId);

          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = {
              role: "assistant",
              content: assistantText,
              urgency: meta?.urgency,
              recommendations: meta?.recommendations,
            };
            return next;
          });
        } else {
          const res = await fetch("/api/chatbot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, stream: false }),
            signal: controller.signal,
          });
          const data = await res.json();
          if (!data.success) {
            applyChatError(data.error);
            return;
          }
          if (data.conversationId) setConversationId(data.conversationId);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: data.message.content,
              urgency: data.message.urgency,
              recommendations: data.message.recommendations,
            },
          ]);
        }
      } catch (err) {
        if (err?.name === "AbortError") return;
        applyChatError({ code: "CHATBOT_FAILED" });
      } finally {
        setLoading(false);
        setStreaming(false);
        abortRef.current = null;
        sendInFlightRef.current = false;
      }
    },
    [
      locale,
      conversationId,
      guestSessionId,
      pendingFiles,
      loading,
      streaming,
      applyChatError,
    ]
  );

  const retry = useCallback(() => {
    if (cooldownSecondsLeft > 0 || sendInFlightRef.current || loading || streaming) {
      return;
    }

    setError(null);
    let retryContent = null;
    setMessages((prev) => {
      for (let i = prev.length - 1; i >= 0; i -= 1) {
        if (prev[i].role === "user") {
          retryContent = prev[i].content;
          return prev.slice(0, i);
        }
      }
      return prev;
    });
    if (retryContent) {
      sendMessage(retryContent);
    }
  }, [sendMessage, cooldownSecondsLeft, loading, streaming]);

  const sendDisabled =
    disabled ||
    loading ||
    streaming ||
    cooldownSecondsLeft > 0 ||
    sendInFlightRef.current;

  return {
    open,
    setOpen,
    messages,
    loading,
    streaming,
    error,
    disabled,
    sendDisabled,
    cooldownSecondsLeft,
    providerInfo,
    pendingFiles,
    setPendingFiles,
    sendMessage,
    uploadFile,
    cancel,
    retry,
    setDisabled,
  };
}
