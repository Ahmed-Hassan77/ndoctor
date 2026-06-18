"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Paperclip, Plus } from "lucide-react";
import {
  addPatientMedicalAttachment,
  deletePatientMedicalAttachment,
} from "@/actions/patient-medical-profile";
import { MEDICAL_ATTACHMENT_CATEGORIES } from "@/lib/patient-medical-constants";
import { MedicalAttachmentsList } from "@/components/medical-attachments-list";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/locale-provider";

const emptyAddForm = {
  fileUrl: "",
  fileName: "",
  category: "LAB_TEST",
  description: "",
};

export function PatientMedicalAttachmentsSection({
  attachments = [],
  dir = "ltr",
}) {
  const { t, labels } = useLocale();
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(emptyAddForm);
  const [deletingId, setDeletingId] = useState(null);
  const { loading: adding, fn: addAttachment } = useFetch(
    addPatientMedicalAttachment
  );
  const { fn: removeAttachment } = useFetch(deletePatientMedicalAttachment);

  const setAdd = (key, value) =>
    setAddForm((prev) => ({ ...prev, [key]: value }));

  const handleAdd = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(addForm).forEach(([k, v]) => {
      fd.append(k, v === "" || v == null ? "" : String(v));
    });
    const res = await addAttachment(fd);
    if (res?.success) {
      toast.success(t("patient.attachmentAdded"));
      setAddForm(emptyAddForm);
      setShowAdd(false);
      router.refresh();
    }
  };

  const handleDelete = async (attachmentId) => {
    setDeletingId(attachmentId);
    const fd = new FormData();
    fd.append("attachmentId", attachmentId);
    const res = await removeAttachment(fd);
    setDeletingId(null);
    if (res?.success) {
      toast.success(t("patient.attachmentRemoved"));
      router.refresh();
    }
  };

  return (
    <Card className="home-card-gradient border-0 ring-1 ring-primary/10" dir={dir}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-primary shrink-0" />
              {t("patient.attachments")}
            </CardTitle>
            <CardDescription className="mt-1">
              {t("patient.attachmentsDesc")}
            </CardDescription>
          </div>
          {!showAdd && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-primary/20 shrink-0"
              onClick={() => setShowAdd(true)}
            >
              <Plus className="h-4 w-4 me-1.5" />
              {t("patient.addAttachment")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAdd && (
          <form
            onSubmit={handleAdd}
            className="min-w-0 space-y-4 rounded-md border home-card-gradient border-0 ring-1 ring-primary/10 bg-muted/10 p-4"
          >
            <div className="space-y-2">
              <Label htmlFor="attachmentFileName">{t("patient.fileName")}</Label>
              <Input
                id="attachmentFileName"
                value={addForm.fileName}
                onChange={(e) => setAdd("fileName", e.target.value)}
                disabled={adding}
                placeholder={t("patient.fileNamePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attachmentFileUrl">{t("patient.fileUrl")}</Label>
              <Input
                id="attachmentFileUrl"
                type="url"
                value={addForm.fileUrl}
                onChange={(e) => setAdd("fileUrl", e.target.value)}
                disabled={adding}
                placeholder={t("patient.fileUrlPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("support.category")}</Label>
              <Select
                value={addForm.category}
                onValueChange={(v) => setAdd("category", v)}
                disabled={adding}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("patient.selectCategory")} />
                </SelectTrigger>
                <SelectContent>
                  {MEDICAL_ATTACHMENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {labels.medicalAttachmentCategory(cat.value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="attachmentDescription">
                {t("patient.descriptionOptional")}
              </Label>
              <Textarea
                id="attachmentDescription"
                value={addForm.description}
                onChange={(e) => setAdd("description", e.target.value)}
                disabled={adding}
                rows={2}
                className="resize-y min-h-[60px]"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm" disabled={adding}>
                {adding ? (
                  <>
                    <Loader2 className="h-4 w-4 me-1.5 animate-spin" />
                    {t("patient.adding")}
                  </>
                ) : (
                  t("patient.saveAttachment")
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={adding}
                onClick={() => {
                  setShowAdd(false);
                  setAddForm(emptyAddForm);
                }}
              >
                {t("common.cancel")}
              </Button>
            </div>
          </form>
        )}

        <MedicalAttachmentsList
          attachments={attachments}
          onDelete={handleDelete}
          deletingId={deletingId}
        />
      </CardContent>
    </Card>
  );
}
