"use client";

import { useRef, useState } from "react";
import { Paperclip, Link2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/components/locale-provider";

/**
 * @param {object} props
 */
export function ChatUpload({
  pendingFiles,
  onUploadFile,
  onUploadUrl,
  onRemovePending,
  loading,
  disabled,
}) {
  const { t } = useLocale();
  const fileRef = useRef(null);
  const [urlMode, setUrlMode] = useState(false);
  const [url, setUrl] = useState("");

  return (
    <div className="space-y-2 border-t border-border px-3 py-2">
      {pendingFiles.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {pendingFiles.map((f) => (
            <li
              key={f.id}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
            >
              <span className="truncate">{f.fileName}</span>
              <button
                type="button"
                onClick={() => onRemovePending(f.id)}
                className="shrink-0"
                aria-label={t("chatbot.removeFile")}
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {urlMode ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("chatbot.urlPlaceholder")}
            disabled={disabled || loading}
            className="h-8 text-xs"
          />
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              disabled={disabled || loading || !url.trim()}
              onClick={() => {
                onUploadUrl(url.trim());
                setUrl("");
                setUrlMode(false);
              }}
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                t("chatbot.addUrl")
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setUrlMode(false)}
            >
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.doc,.docx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadFile(file);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            disabled={disabled || loading}
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip className="h-3.5 w-3.5 me-1" />
            {t("chatbot.attachFile")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            disabled={disabled || loading}
            onClick={() => setUrlMode(true)}
          >
            <Link2 className="h-3.5 w-3.5 me-1" />
            {t("chatbot.attachUrl")}
          </Button>
        </div>
      )}
    </div>
  );
}
