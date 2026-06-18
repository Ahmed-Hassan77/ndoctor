import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { db } from "@/lib/prisma";

export const MAX_FILE_BYTES =
  Number(process.env.CHATBOT_MAX_FILE_BYTES) || 10 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const PRIVATE_BLOCK_HOSTS =
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0|\[::1\])/i;

function uploadRoot() {
  const base = process.env.CHATBOT_UPLOAD_DIR || "storage/chatbot";
  return path.isAbsolute(base)
    ? base
    : path.join(/* turbopackIgnore: true */ process.cwd(), base);
}

export function validateMimeType(mimeType) {
  return ALLOWED_MIME_TYPES.has(mimeType);
}

export function validateFileSize(sizeBytes) {
  return sizeBytes > 0 && sizeBytes <= MAX_FILE_BYTES;
}

export function isImageMime(mimeType) {
  return typeof mimeType === "string" && mimeType.startsWith("image/");
}

/**
 * @param {string} rawUrl
 */
export function validateRemoteUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, code: "INVALID_URL" };
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { ok: false, code: "INVALID_URL" };
  }
  if (PRIVATE_BLOCK_HOSTS.test(parsed.hostname)) {
    return { ok: false, code: "URL_NOT_ALLOWED" };
  }
  return { ok: true, url: parsed.toString() };
}

async function extractPdfText(buffer) {
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return (result.text || "").slice(0, 12000);
  } catch {
    return null;
  }
}

async function extractDocxText(buffer) {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return (result.value || "").slice(0, 12000);
  } catch {
    return null;
  }
}

/**
 * @param {Buffer} buffer
 * @param {string} mimeType
 */
export async function extractTextFromFile(buffer, mimeType) {
  if (mimeType === "text/plain") {
    return buffer.toString("utf8").slice(0, 12000);
  }

  if (isImageMime(mimeType)) {
    return null;
  }

  if (mimeType === "application/pdf") {
    const text = await extractPdfText(buffer);
    return text.trim() ? text : null;
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    const text = await extractDocxText(buffer);
    return text.trim() ? text : null;
  }

  return null;
}

/**
 * @param {{ buffer: Buffer; fileName: string; mimeType: string; conversationId: string; userId?: string | null }} input
 */
export async function storeUploadedFile(input) {
  const dir = path.join(uploadRoot(), input.conversationId);
  await mkdir(dir, { recursive: true });
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const storagePath = path.join(dir, `${randomUUID()}-${safeName}`);
  await writeFile(storagePath, input.buffer);

  const extractedText = await extractTextFromFile(input.buffer, input.mimeType);

  return db.chatFile.create({
    data: {
      conversationId: input.conversationId,
      userId: input.userId ?? null,
      fileName: safeName,
      mimeType: input.mimeType,
      sizeBytes: input.buffer.length,
      storagePath,
      sourceType: "upload",
      extractedText,
    },
  });
}

/**
 * @param {{ url: string; conversationId: string; userId?: string | null; fileName?: string }} input
 */
export async function fetchAndStoreRemoteFile(input) {
  const validation = validateRemoteUrl(input.url);
  if (!validation.ok) {
    throw new Error(validation.code);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(validation.url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "ShifaaChatbot/1.0" },
    });

    if (!res.ok) throw new Error("FETCH_FAILED");

    const mimeType =
      res.headers.get("content-type")?.split(";")[0]?.trim() ||
      "application/octet-stream";
    if (!validateMimeType(mimeType)) throw new Error("UNSUPPORTED_FILE_TYPE");

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (!validateFileSize(buffer.length)) throw new Error("FILE_TOO_LARGE");

    const fileName =
      input.fileName ||
      validation.url.split("/").pop()?.split("?")[0] ||
      "remote-file";

    const dir = path.join(uploadRoot(), input.conversationId);
    await mkdir(dir, { recursive: true });
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
    const storagePath = path.join(dir, `${randomUUID()}-${safeName}`);
    await writeFile(storagePath, buffer);

    const extractedText = await extractTextFromFile(buffer, mimeType);

    return db.chatFile.create({
      data: {
        conversationId: input.conversationId,
        userId: input.userId ?? null,
        fileName: safeName,
        mimeType,
        sizeBytes: buffer.length,
        storagePath,
        sourceType: "url",
        sourceUrl: validation.url,
        extractedText,
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * @param {string[]} fileIds
 * @param {string} conversationId
 */
export async function getConversationFiles(fileIds, conversationId) {
  if (!fileIds?.length) return [];
  return db.chatFile.findMany({
    where: { id: { in: fileIds }, conversationId },
  });
}

/**
 * @param {string} storagePath
 */
export async function readStoredFile(storagePath) {
  const root = uploadRoot();
  const resolved = path.resolve(storagePath);
  if (!resolved.startsWith(path.resolve(root))) {
    throw new Error("FORBIDDEN");
  }
  return readFile(resolved);
}
