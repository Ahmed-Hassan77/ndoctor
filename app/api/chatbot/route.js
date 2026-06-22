import { NextResponse } from "next/server";
import { getProviderStatus } from "@/lib/chatbot/providers";
import {
  runChatTurn,
  streamChatTurn,
  mapChatbotError,
  loadConversationMessages,
  getOrCreateConversation,
} from "@/lib/chatbot/service";
import { getChatUserContext, assertConversationAccess } from "@/lib/chatbot/auth";
import {
  storeUploadedFile,
  fetchAndStoreRemoteFile,
  validateMimeType,
  validateFileSize,
} from "@/lib/chatbot/files/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/chatbot?conversationId=&guestSessionId=
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");
    const guestSessionId = searchParams.get("guestSessionId");
    const statusOnly = searchParams.get("status") === "1";

    if (statusOnly) {
      return NextResponse.json({ success: true, provider: getProviderStatus() });
    }

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR" } },
        { status: 400 }
      );
    }

    const { user } = await getChatUserContext();
    const conversation = await assertConversationAccess(
      user?.id,
      guestSessionId,
      conversationId
    );
    if (!conversation) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN" } },
        { status: 403 }
      );
    }

    const messages = await loadConversationMessages(conversationId);
    return NextResponse.json({
      success: true,
      conversationId,
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        metadata: m.metadata,
      })),
    });
  } catch (error) {
    const mapped = mapChatbotError(error);
    return NextResponse.json(
      { success: false, error: mapped },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chatbot — JSON chat or multipart upload
 */
export async function POST(request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    return handleUpload(request);
  }

  let body;
  try {
    body = await request.json();
    const stream = Boolean(body.stream);
    const locale = body.locale === "ar" ? "ar" : "en";

    if (stream) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const part of streamChatTurn(body)) {
              if (typeof part === "string") {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "delta", text: part })}\n\n`
                  )
                );
              } else if (part?.type === "done") {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(part)}\n\n`)
                );
              }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (error) {
            const mapped = mapChatbotError(error, locale);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "error", error: mapped })}\n\n`
              )
            );
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    const result = await runChatTurn(body);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const locale = body?.locale === "ar" ? "ar" : "en";
    const mapped = mapChatbotError(error, locale);
    const status =
      mapped.code === "AI_PROVIDER_UNAVAILABLE"
        ? 503
        : mapped.code === "AI_PROVIDER_RATE_LIMIT"
          ? 429
          : 500;
    return NextResponse.json(
      { success: false, error: mapped },
      { status }
    );
  }
}

async function handleUpload(request) {
  try {
    const formData = await request.formData();
    const locale = formData.get("locale")?.toString() || "en";
    const guestSessionId = formData.get("guestSessionId")?.toString();
    let conversationId = formData.get("conversationId")?.toString();
    const fileUrl = formData.get("fileUrl")?.toString()?.trim();
    const file = formData.get("file");

    const conversation = await getOrCreateConversation({
      locale,
      guestSessionId,
      conversationId,
    });
    conversationId = conversation.id;

    const { user } = await getChatUserContext();

    let record;
    if (fileUrl) {
      record = await fetchAndStoreRemoteFile({
        url: fileUrl,
        conversationId,
        userId: user?.id,
      });
    } else if (file && typeof file === "object" && "arrayBuffer" in file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const mimeType = file.type || "application/octet-stream";
      if (!validateMimeType(mimeType)) {
        return NextResponse.json(
          { success: false, error: { code: "UNSUPPORTED_FILE_TYPE" } },
          { status: 400 }
        );
      }
      if (!validateFileSize(buffer.length)) {
        return NextResponse.json(
          { success: false, error: { code: "FILE_TOO_LARGE" } },
          { status: 400 }
        );
      }
      record = await storeUploadedFile({
        buffer,
        fileName: file.name || "upload",
        mimeType,
        conversationId,
        userId: user?.id,
      });
    } else {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR" } },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      conversationId,
      guestSessionId: conversation.guestSessionId,
      file: {
        id: record.id,
        fileName: record.fileName,
        mimeType: record.mimeType,
        sizeBytes: record.sizeBytes,
      },
    });
  } catch (error) {
    const code = error?.message || "UPLOAD_FAILED";
    return NextResponse.json(
      { success: false, error: { code, message: error?.message } },
      { status: 400 }
    );
  }
}
