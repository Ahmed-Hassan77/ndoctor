import { readStoredFile, isImageMime } from "@/lib/chatbot/files/storage";

export { isImageMime };

/**
 * @param {Array<{ fileName: string; mimeType: string; extractedText?: string | null }>} attachments
 */
export function buildDocumentTextBlock(attachments) {
  const docs = attachments.filter((f) => !isImageMime(f.mimeType));
  if (!docs.length) return "";

  return docs
    .map((f) => {
      const text = f.extractedText?.trim();
      if (text) {
        return `File: ${f.fileName} (${f.mimeType})\n${text}`;
      }
      return `File: ${f.fileName} (${f.mimeType})\n[No text could be extracted from this file.]`;
    })
    .join("\n\n");
}

/**
 * Build provider-ready user content (plain text or multimodal parts).
 * @param {string} message
 * @param {Array<{ fileName: string; mimeType: string; storagePath: string; extractedText?: string | null }>} attachments
 * @param {'en' | 'ar'} locale
 * @returns {Promise<string | import("@/lib/chatbot/types").ChatContentPart[]>}
 */
export async function buildUserMessageContent(message, attachments, locale) {
  const images = attachments.filter((f) => isImageMime(f.mimeType));
  const docBlock = buildDocumentTextBlock(attachments);
  const userText = message?.trim();

  /** @type {import("@/lib/chatbot/types").ChatContentPart[]} */
  const parts = [];

  let textPrompt = userText || "";
  if (docBlock) {
    textPrompt = userText
      ? `${userText}\n\n--- Uploaded documents ---\n${docBlock}`
      : locale === "ar"
        ? `يرجى مراجعة الملفات المرفقة والإجابة على أسئلة المستخدم.\n\n${docBlock}`
        : `Please review the attached file(s) and answer the user's question.\n\n${docBlock}`;
  } else if (!userText && images.length) {
    textPrompt =
      locale === "ar"
        ? "صف ما تراه في الصورة/الصور المرفقة. قدم ملاحظات عامة فقط — وليس تشخيصاً طبياً — وانصح باستشارة طبيب."
        : "Describe what you see in the attached image(s). Provide general observations only — not a medical diagnosis — and recommend consulting a doctor.";
  }

  if (textPrompt) {
    parts.push({ type: "text", text: textPrompt });
  }

  for (const img of images) {
    const buffer = await readStoredFile(img.storagePath);
    parts.push({
      type: "image",
      mimeType: img.mimeType,
      base64: buffer.toString("base64"),
    });
  }

  if (parts.length === 1 && parts[0].type === "text") {
    return parts[0].text;
  }
  if (!parts.length) {
    return userText || "";
  }
  return parts;
}
