import type { Metadata } from "next";
import PublicInfoPage from "@/components/PublicInfoPage";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata: Metadata = {
  title: "Privacy Policy | FocusForge",
  description: "How FocusForge handles account, study, payment, support, and export data."
};

const supportEmail = SUPPORT_EMAIL;

export default function PrivacyPage() {
  return (
    <PublicInfoPage
      eyebrow="Privacy"
      title="Your study data should stay yours."
      subtitle="This launch-ready placeholder explains how FocusForge treats account, study, payment, support, and operational data. It should be legally reviewed before full commercial launch."
      updatedLabel="v1.3.0"
      sections={[
        {
          title: "Data we collect",
          body: [
            "FocusForge stores account data, profile preferences, study records, support requests, feedback, and safe payment metadata needed to operate the app.",
            "Study data includes tasks, focus sessions, notes, subjects, homework, exams, timetable, revisions, topics, marks, backlog, battle plans, habits, mock tests, goals, journal entries, reviews, reminders, and derived analytics inputs."
          ],
          bullets: ["Firebase stores user-scoped app data.", "Razorpay processes payment checkout and provides order/payment identifiers.", "Support forms may store your email, message, category, and optional payment identifiers."]
        },
        {
          title: "How data is used",
          body: [
            "Data powers the product features you use, account support, plan verification, export, and product reliability checks.",
            "FocusForge does not need to sell study data to function."
          ]
        },
        {
          title: "Exports and account controls",
          body: [
            "Users can export supported data from Settings. Study data can be cleared separately from billing and audit records.",
            "Downgrades or expired plans do not delete study data. Payment and billing records may be retained for legal, accounting, fraud-prevention, and support reasons."
          ]
        },
        {
          title: "Placeholders and contact",
          body: [
            `Support contact: ${supportEmail}`,
            "Business: [Business Name]",
            "Address: [Registered Address if applicable]"
          ]
        }
      ]}
    />
  );
}
