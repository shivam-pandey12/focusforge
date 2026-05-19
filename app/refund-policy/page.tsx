import type { Metadata } from "next";
import PublicInfoPage from "@/components/PublicInfoPage";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata: Metadata = {
  title: "Refund Policy | FocusForge",
  description: "Refund process guidance for FocusForge paid access periods and Razorpay payment issues."
};

const supportEmail = SUPPORT_EMAIL;

export default function RefundPolicyPage() {
  return (
    <PublicInfoPage
      eyebrow="Refund Policy"
      title="Refund requests are handled carefully."
      subtitle="FocusForge is a digital SaaS access-period product. This placeholder policy should be legally reviewed before full commercial launch."
      updatedLabel="v1.3.0"
      sections={[
        {
          title: "Digital access periods",
          body: [
            "Paid access unlocks Pro or Elite features for a fixed access period after Razorpay verification. Current public passes are monthly, 4-month season, and yearly options.",
            "Refund eligibility may depend on duplicate payments, accidental charges, failed activation, local law, and support review."
          ]
        },
        {
          title: "Duplicate or failed activation",
          body: [
            "If money was deducted but your plan did not activate, contact support with your Razorpay payment ID or order ID.",
            "Your study data remains safe while support reviews payment status. Refund or activation handling can depend on Razorpay, bank status, duplicate-payment evidence, and applicable policy."
          ]
        },
        {
          title: "How to request a refund",
          body: [
            "Submit a support ticket with account email, plan, billing cycle, Razorpay payment ID, Razorpay order ID if available, and a short explanation.",
            `Use Refresh billing status first if payment succeeded but access has not updated yet. Support contact: ${supportEmail}.`
          ]
        }
      ]}
    />
  );
}
