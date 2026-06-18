import { NextResponse } from "next/server";
import { verifyAdmin } from "@/actions/admin";
import {
  runAdminAnalytics,
  streamAdminAnalytics,
  reportToPrintableText,
} from "@/lib/chatbot/analytics/service";
import { mapChatbotError } from "@/lib/chatbot/service";
import { getProviderStatus } from "@/lib/chatbot/providers";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json(
      { success: false, error: { code: "ADMIN_ONLY" } },
      { status: 403 }
    );
  }
  return NextResponse.json({
    success: true,
    provider: getProviderStatus(),
  });
}

export async function POST(request) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json(
      { success: false, error: { code: "ADMIN_ONLY" } },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const stream = Boolean(body.stream);

    if (body.export === "text" && body.report) {
      const text = reportToPrintableText(
        body.report,
        body.locale === "ar" ? "ar" : "en"
      );
      return NextResponse.json({ success: true, text });
    }

    if (stream) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const part of streamAdminAnalytics(body)) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(part)}\n\n`)
              );
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (error) {
            const mapped = mapChatbotError(error);
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

    const result = await runAdminAnalytics(body);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const mapped = mapChatbotError(error);
    return NextResponse.json(
      { success: false, error: mapped },
      { status: mapped.code === "AI_PROVIDER_UNAVAILABLE" ? 503 : 500 }
    );
  }
}
