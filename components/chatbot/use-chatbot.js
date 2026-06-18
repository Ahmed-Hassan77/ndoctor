"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const GUEST_KEY = "shifaa_chat_guest";

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

export function useChatbot(locale) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(/** @type {ChatMessage[]} */ ([]));
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [disabled, setDisabled] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [guestSessionId] = useState(readGuestSessionId);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [providerInfo, setProviderInfo] = useState(null);
  const abortRef = useRef(null);

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

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    setLoading(false);
  }, []);

  const uploadFile = useCallback(
    async (fileOrUrl, isUrl = false) => {
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
        setError(err instanceof Error ? err.message : "UPLOAD_FAILED");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [locale, guestSessionId, conversationId]
  );

  const sendMessage = useCallback(
    async (text, { useStream = true } = {}) => {
      const trimmed = text?.trim();
      const attachmentIds = pendingFiles.map((f) => f.id);
      if (!trimmed && attachmentIds.length === 0) return;

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
            throw new Error(errData.error?.code || "CHATBOT_FAILED");
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let assistantText = "";
          let meta = null;

          setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data:")) continue;
              const raw = line.slice(5).trim();
              if (raw === "[DONE]") continue;
              try {
                const event = JSON.parse(raw);
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
                  throw new Error(event.error?.code || "CHATBOT_FAILED");
                }
              } catch (parseErr) {
                if (parseErr instanceof Error && parseErr.message !== raw) {
                  throw parseErr;
                }
              }
            }
          }

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
            throw new Error(data.error?.code || "CHATBOT_FAILED");
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
        const code = err instanceof Error ? err.message : "CHATBOT_FAILED";
        setError(code);
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && !last.content) {
            return prev.slice(0, -1);
          }
          return prev;
        });
      } finally {
        setLoading(false);
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [locale, conversationId, guestSessionId, pendingFiles]
  );

  const retry = useCallback(() => {
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
  }, [sendMessage]);

  return {
    open,
    setOpen,
    messages,
    loading,
    streaming,
    error,
    disabled,
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
