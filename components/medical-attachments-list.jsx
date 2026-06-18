"use client";

import { ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";

export function MedicalAttachmentsList({
  attachments,
  emptyMessage,
  onDelete,
  deletingId,
  readOnly = false,
}) {
  const { t } = useLocale();
  const empty = emptyMessage ?? t("patient.noAttachments");

  if (!attachments?.length) {
    return (
      <p className="text-sm text-muted-foreground italic">{empty}</p>
    );
  }

  return (
    <ul className="min-w-0 space-y-2">
      {attachments.map((item) => (
        <li
          key={item.id}
          className="min-w-0 flex flex-col sm:flex-row sm:items-start gap-2 rounded-md border home-card-gradient border-0 ring-1 ring-primary/10 bg-muted/20 p-3"
        >
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex min-w-0 items-start gap-2">
              <FileText className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-foreground break-words">
                  {item.fileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.categoryLabel}
                </p>
                {item.description ? (
                  <p className="text-xs text-muted-foreground mt-1 break-words whitespace-pre-line">
                    {item.description}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-end">
            <Button
              variant="outline"
              size="sm"
              className="border-primary/20"
              asChild
            >
              <a
                href={item.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3.5 w-3.5 me-1.5" />
                {t("patient.open")}
              </a>
            </Button>
            {!readOnly && onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                disabled={deletingId === item.id}
                onClick={() => onDelete(item.id)}
              >
                {deletingId === item.id
                  ? t("patient.removing")
                  : t("patient.delete")}
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
