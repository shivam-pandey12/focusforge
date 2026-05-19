import { NextResponse } from "next/server";
import { getAdminFirestore, ServerSetupError } from "@/lib/firebase/admin";
import { verifyOptionalRequestUser } from "@/lib/server/adminAccess";
import { withApiLogging } from "@/lib/server/observability";
import { enforceRateLimit, RateLimitError } from "@/lib/server/rateLimit";
import type { FeedbackType, SupportSeverity } from "@/types";

export const runtime = "nodejs";

const FEEDBACK_TYPES: FeedbackType[] = ["bug", "feature", "rating", "other"];
const SEVERITIES: SupportSeverity[] = ["low", "medium", "high", "critical"];

function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

function optionalEmail(value: unknown): string {
  const email = cleanText(value, 180).toLowerCase();

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function jsonError(message: string, status = 400, setup = false) {
  return NextResponse.json({ error: message, setup }, { status });
}

export async function POST(request: Request) {
  return withApiLogging("feedback.create", async (logContext) => {
    try {
      const user = await verifyOptionalRequestUser(request);
      logContext.userId = user?.uid;
      enforceRateLimit({ request, action: "feedback:create", userId: user?.uid, limit: 8, windowMs: 60_000 });

      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const type = cleanText(body.type, 40) as FeedbackType;
      const title = cleanText(body.title, 140);
      const description = cleanText(body.description, 4000);
      const severity = cleanText(body.severity, 40) as SupportSeverity;
      const rating = Number(body.rating ?? 0);
      const email = optionalEmail(body.email) || user?.email || "";
      const relatedRoute = cleanText(body.relatedRoute, 240);
      const browserInfo = cleanText(body.browserInfo, 500);
      const deviceInfo = cleanText(body.deviceInfo, 240);
      const pageUrl = cleanText(body.pageUrl, 500);
      const userAgent = cleanText(body.userAgent ?? request.headers.get("user-agent"), 500);

      if (!FEEDBACK_TYPES.includes(type)) {
        return jsonError("Choose a valid feedback type.");
      }

      if (!title) {
        return jsonError("Enter a feedback title.");
      }

      if (description.length < 10) {
        return jsonError("Describe your feedback in at least 10 characters.");
      }

      if (severity && !SEVERITIES.includes(severity)) {
        return jsonError("Choose a valid severity.");
      }

      if (type === "rating" && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
        return jsonError("Choose a rating from 1 to 5.");
      }

      const { db, FieldValue } = await getAdminFirestore();
      const feedbackRef = db.collection("feedback").doc();

      await feedbackRef.set({
        id: feedbackRef.id,
        ...(user?.uid ? { userId: user.uid } : {}),
        email,
        type,
        title,
        description,
        severity: severity || (type === "bug" ? "medium" : "low"),
        relatedRoute,
        browserInfo,
        deviceInfo,
        rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null,
        pageUrl,
        userAgent,
        status: "new",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      return NextResponse.json({ id: feedbackRef.id, status: "new" });
    } catch (error) {
      logContext.errorClass = error instanceof Error ? error.name : "UnknownError";

      if (error instanceof RateLimitError) {
        logContext.rateLimited = true;
        return NextResponse.json({ error: error.message, retryAfterSeconds: error.retryAfterSeconds }, { status: 429 });
      }

      if (error instanceof ServerSetupError) {
        logContext.setup = true;
        return jsonError(error.message, 503, true);
      }

      return jsonError(error instanceof Error ? error.message : "Could not submit feedback.", 500);
    }
  });
}
