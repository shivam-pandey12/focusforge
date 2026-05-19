import type { EmailEventType } from "@/types";

interface EmailTemplateInput {
  displayName?: string | null;
  planName?: string;
  summaryText?: string;
}

export interface EmailTemplate {
  subject: string;
  preview: string;
  body: string;
}

export function buildEmailTemplate(type: EmailEventType, input: EmailTemplateInput = {}): EmailTemplate {
  const name = input.displayName?.trim() || "there";

  switch (type) {
    case "welcome":
      return {
        subject: "Welcome to FocusForge",
        preview: "Your calm study workspace is ready.",
        body: `Hi ${name}, welcome to FocusForge. Start with one task, one focus session, and one review.`
      };
    case "payment_success":
      return {
        subject: "Your FocusForge plan is active",
        preview: `${input.planName ?? "Your paid plan"} is now active.`,
        body: `Hi ${name}, your FocusForge plan is active. If your plan does not show correctly, refresh billing status or contact support with your payment ID.`
      };
    case "plan_expiry_reminder":
      return {
        subject: "Your FocusForge access period is ending soon",
        preview: "Your data stays safe even if access returns to Free.",
        body: `Hi ${name}, your paid access period is ending soon. Your study data stays safe and can be unlocked again by upgrading.`
      };
    case "weekly_summary":
      return {
        subject: "Your FocusForge weekly summary",
        preview: input.summaryText ?? "A calm recap of your study week.",
        body: `Hi ${name}, here is your weekly FocusForge summary: ${input.summaryText ?? "keep building steady progress."}`
      };
  }
}
