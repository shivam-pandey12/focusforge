import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { getAdminFirestore, ServerSetupError } from "@/lib/firebase/admin";
import { verifyOptionalRequestUser } from "@/lib/server/adminAccess";
import { withApiLogging } from "@/lib/server/observability";
import { enforceRateLimit, RateLimitError } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

function getDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function getReferrerOrigin(value: string): string {
  try {
    return value ? new URL(value).origin : "";
  } catch {
    return "";
  }
}

function getDeviceType(width: number): "mobile" | "tablet" | "desktop" {
  if (width < 640) {
    return "mobile";
  }

  if (width < 1024) {
    return "tablet";
  }

  return "desktop";
}

export async function POST(request: Request) {
  return withApiLogging("traffic.page-view", async (logContext) => {
    try {
      const user = await verifyOptionalRequestUser(request);
      logContext.userId = user?.uid;
      enforceRateLimit({ request, action: "traffic:page-view", userId: user?.uid, limit: 60, windowMs: 60_000 });

      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const path = cleanText(body.path, 160);
      const visitorId = cleanText(body.visitorId, 160);
      const sessionId = cleanText(body.sessionId, 160);
      const viewportWidth = Number(body.viewportWidth ?? 0);

      if (!path.startsWith("/") || !visitorId || !sessionId) {
        return NextResponse.json({ ok: false }, { status: 202 });
      }

      const { db, FieldValue } = await getAdminFirestore();
      const now = new Date();
      const trafficRef = db.collection("trafficEvents").doc();

      await trafficRef.set({
        id: trafficRef.id,
        eventType: "page_view",
        path,
        visitorHash: hashValue(visitorId),
        sessionHash: hashValue(sessionId),
        ...(user?.uid ? { userId: user.uid } : {}),
        dateKey: getDateKey(now),
        referrerOrigin: getReferrerOrigin(cleanText(body.referrer, 500)),
        deviceType: getDeviceType(Number.isFinite(viewportWidth) ? viewportWidth : 0),
        createdAt: FieldValue.serverTimestamp()
      });

      return NextResponse.json({ ok: true });
    } catch (error) {
      logContext.errorClass = error instanceof Error ? error.name : "UnknownError";

      if (error instanceof RateLimitError) {
        logContext.rateLimited = true;
        return NextResponse.json({ ok: false, retryAfterSeconds: error.retryAfterSeconds }, { status: 429 });
      }

      if (error instanceof ServerSetupError) {
        logContext.setup = true;
        return NextResponse.json({ ok: false, setup: true }, { status: 202 });
      }

      return NextResponse.json({ ok: false }, { status: 202 });
    }
  });
}
