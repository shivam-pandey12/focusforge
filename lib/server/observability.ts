import { createHash } from "crypto";
import { NextResponse } from "next/server";

export interface ApiLogContext {
  userId?: string;
  setup?: boolean;
  rateLimited?: boolean;
  errorClass?: string;
}

function shouldLogApiEvents(): boolean {
  if (process.env.FOCUSFORGE_API_LOGS === "true") {
    return true;
  }

  if (process.env.FOCUSFORGE_API_LOGS === "false") {
    return false;
  }

  return process.env.NODE_ENV !== "production";
}

function hashUserId(userId?: string): string | undefined {
  if (!userId) {
    return undefined;
  }

  return createHash("sha256").update(userId).digest("hex").slice(0, 12);
}

function logApiEvent(route: string, status: number, durationMs: number, context: ApiLogContext): void {
  if (!shouldLogApiEvents()) {
    return;
  }

  const event = {
    route,
    status,
    durationMs: Math.round(durationMs),
    userHash: hashUserId(context.userId),
    setup: context.setup || undefined,
    rateLimited: context.rateLimited || undefined,
    errorClass: context.errorClass
  };

  if (status >= 400) {
    console.warn("[FocusForge API]", event);
    return;
  }

  console.info("[FocusForge API]", event);
}

export async function withApiLogging(
  route: string,
  handler: (context: ApiLogContext) => Promise<Response>
): Promise<Response> {
  const startedAt = Date.now();
  const context: ApiLogContext = {};

  try {
    const response = await handler(context);
    logApiEvent(route, response.status, Date.now() - startedAt, context);
    return response;
  } catch (error) {
    context.errorClass = error instanceof Error ? error.name : "UnknownError";
    logApiEvent(route, 500, Date.now() - startedAt, context);
    return NextResponse.json({ error: "Request failed. Please try again." }, { status: 500 });
  }
}
