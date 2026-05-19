import type { Metadata } from "next";
import PublicInfoPage from "@/components/PublicInfoPage";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata: Metadata = {
  title: "Terms And Conditions | FocusForge",
  description: "FocusForge beta terms for accounts, study data, paid plans, availability, and acceptable use."
};

const supportEmail = SUPPORT_EMAIL;

export default function TermsPage() {
  return (
    <PublicInfoPage
      eyebrow="Terms"
      title="Use FocusForge as a focused study workspace."
      subtitle="These practical beta terms describe expected use, account responsibility, paid access periods, and launch-stage limitations. Review with legal counsel before full launch."
      updatedLabel="v1.3.0"
      sections={[
        {
          title: "Acceptable use",
          body: [
            "FocusForge is for study planning, focus sessions, progress tracking, reviews, and related productivity workflows.",
            "Do not abuse the service, attempt to access another user's data, bypass security controls, or store unlawful content."
          ]
        },
        {
          title: "Accounts and responsibility",
          body: [
            "You are responsible for maintaining access to your login method and for the information you add to your account.",
            "Shared devices should be signed out after use."
          ]
        },
        {
          title: "Paid plans and availability",
          body: [
            "Starter, Pro, and Elite plans control feature access. Paid plans activate only after server-side Razorpay verification.",
            "Starter limits creation of some records, but downgrades and expiry do not delete existing study data.",
            "FocusForge depends on Firebase, Razorpay, browser APIs, and network access. The service may change as beta issues are fixed.",
            `For account or payment issues, contact support at ${supportEmail} or use the support form.`
          ]
        },
        {
          title: "Limitations",
          body: [
            "FocusForge provides organization and rule-based study insights; it does not guarantee academic outcomes or exam results.",
            "These terms are launch placeholder content and should be replaced with reviewed legal terms before broad commercial use."
          ]
        }
      ]}
    />
  );
}
