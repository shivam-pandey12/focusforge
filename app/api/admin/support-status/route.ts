import { NextResponse } from "next/server";
import { getAdminFirestore, ServerSetupError } from "@/lib/firebase/admin";
import { RequestAuthError, verifyAdminRequestUser } from "@/lib/server/adminAccess";
import { withApiLogging } from "@/lib/server/observability";
import type { FeedbackStatus, SupportTicketStatus } from "@/types";

export const runtime = "nodejs";

const SUPPORT_STATUSES: SupportTicketStatus[] = ["open", "in_review", "resolved"];
const FEEDBACK_STATUSES: FeedbackStatus[] = ["new", "reviewed", "planned", "fixed", "closed"];

function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

function jsonError(message: string, status = 400, setup = false) {
  return NextResponse.json({ error: message, setup }, { status });
}

export async function POST(request: Request) {
  return withApiLogging("admin.support-status", async (logContext) => {
    try {
      const admin = await verifyAdminRequestUser(request);
      logContext.userId = admin.uid;

      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const collectionName = cleanText(body.collection, 40);
      const id = cleanText(body.id, 180);
      const status = cleanText(body.status, 40);

      if (!id) {
        return jsonError("Missing record id.");
      }

      if (collectionName === "supportTickets" && !SUPPORT_STATUSES.includes(status as SupportTicketStatus)) {
        return jsonError("Choose a valid support ticket status.");
      }

      if (collectionName === "feedback" && !FEEDBACK_STATUSES.includes(status as FeedbackStatus)) {
        return jsonError("Choose a valid feedback status.");
      }

      if (collectionName !== "supportTickets" && collectionName !== "feedback") {
        return jsonError("Unsupported admin support collection.");
      }

      const { db, FieldValue } = await getAdminFirestore();
      await db.collection(collectionName).doc(id).set(
        {
          status,
          updatedAt: FieldValue.serverTimestamp(),
          adminUpdatedAt: FieldValue.serverTimestamp(),
          adminUpdatedBy: admin.email ?? admin.uid
        },
        { merge: true }
      );

      return NextResponse.json({ id, status });
    } catch (error) {
      logContext.errorClass = error instanceof Error ? error.name : "UnknownError";

      if (error instanceof RequestAuthError) {
        return jsonError(error.message, error.status);
      }

      if (error instanceof ServerSetupError) {
        logContext.setup = true;
        return jsonError(error.message, 503, true);
      }

      return jsonError(error instanceof Error ? error.message : "Could not update support status.", 500);
    }
  });
}
