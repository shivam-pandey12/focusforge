import { NextResponse } from "next/server";
import { getAdminFirestore, ServerSetupError } from "@/lib/firebase/admin";
import { verifyOptionalRequestUser } from "@/lib/server/adminAccess";
import { withApiLogging } from "@/lib/server/observability";
import { enforceRateLimit, RateLimitError } from "@/lib/server/rateLimit";
import type { SupportSeverity, SupportTicketCategory } from "@/types";

export const runtime = "nodejs";

const CATEGORIES: SupportTicketCategory[] = [
  "payment_issue",
  "plan_not_active",
  "account_issue",
  "account_data_issue",
  "feature_issue",
  "feature_request",
  "bug_report",
  "general_question",
  "other"
];

const SEVERITIES: SupportSeverity[] = ["low", "medium", "high", "critical"];

function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function jsonError(message: string, status = 400, setup = false) {
  return NextResponse.json({ error: message, setup }, { status });
}

export async function POST(request: Request) {
  return withApiLogging("support.create-ticket", async (logContext) => {
    try {
      const user = await verifyOptionalRequestUser(request);
      logContext.userId = user?.uid;
      enforceRateLimit({ request, action: "support:create-ticket", userId: user?.uid, limit: 6, windowMs: 60_000 });

      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const name = cleanText(body.name, 120);
      const email = cleanText(body.email ?? user?.email ?? "", 180).toLowerCase();
      const category = cleanText(body.category, 80) as SupportTicketCategory;
      const subject = cleanText(body.subject, 140);
      const message = cleanText(body.message, 4000);
      const severity = cleanText(body.severity, 40) as SupportSeverity;
      const relatedRoute = cleanText(body.relatedRoute, 240);
      const paymentId = cleanText(body.paymentId, 120);
      const orderId = cleanText(body.orderId, 120);
      const screenshotUrl = cleanText(body.screenshotUrl, 500);
      const browserInfo = cleanText(body.browserInfo ?? request.headers.get("user-agent"), 500);
      const deviceInfo = cleanText(body.deviceInfo, 240);

      if (!isEmail(email)) {
        return jsonError("Enter a valid email address.");
      }

      if (!CATEGORIES.includes(category)) {
        return jsonError("Choose a valid support category.");
      }

      if (severity && !SEVERITIES.includes(severity)) {
        return jsonError("Choose a valid severity.");
      }

      if (!subject) {
        return jsonError("Enter a short subject.");
      }

      if (message.length < 10) {
        return jsonError("Describe the issue in at least 10 characters.");
      }

      const { db, FieldValue } = await getAdminFirestore();
      const ticketRef = db.collection("supportTickets").doc();

      await ticketRef.set({
        id: ticketRef.id,
        ...(user?.uid ? { userId: user.uid } : {}),
        name,
        email,
        category,
        subject,
        message,
        severity: severity || "medium",
        relatedRoute,
        paymentId,
        orderId,
        screenshotUrl,
        browserInfo,
        deviceInfo,
        status: "open",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      return NextResponse.json({ id: ticketRef.id, status: "open" });
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

      return jsonError(error instanceof Error ? error.message : "Could not submit support request.", 500);
    }
  });
}
