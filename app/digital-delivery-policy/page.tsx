import type { Metadata } from "next";
import PublicInfoPage from "@/components/PublicInfoPage";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata: Metadata = {
  title: "Digital Delivery / No Shipping Policy | FocusForge",
  description: "Digital delivery and no-shipping policy for FocusForge paid access."
};

const supportEmail = SUPPORT_EMAIL;

export default function DigitalDeliveryPolicyPage() {
  return (
    <PublicInfoPage
      eyebrow="Digital Delivery"
      title="FocusForge is delivered digitally."
      subtitle="FocusForge is a web-based student planner and study system. No physical product is shipped."
      updatedLabel="v1.3.1"
      sections={[
        {
          title: "No physical shipping",
          body: [
            "FocusForge sells digital access to app features, study tools, planner data, and premium plan capabilities.",
            "There are no physical goods, shipping charges, courier deliveries, tracking numbers, or delivery addresses involved in a FocusForge purchase."
          ]
        },
        {
          title: "How digital access is delivered",
          body: [
            "After a successful Razorpay payment and server-side verification, paid access is added to the FocusForge account used during checkout.",
            "Users should sign in with the same account they used before payment. The Billing page shows the current plan, access period, and recent payment status where available."
          ],
          bullets: [
            "Monthly passes currently unlock 30 days of access.",
            "Season passes currently unlock 4 months of access.",
            "Yearly passes currently unlock 365 days of access."
          ]
        },
        {
          title: "Activation timing",
          body: [
            "In most cases, digital access appears shortly after successful payment verification.",
            "If money was deducted but the plan is not active, use Refresh billing status first, then contact support with the Razorpay payment ID or order ID."
          ]
        },
        {
          title: "Support for delivery issues",
          body: [
            `For payment verification or digital access issues, contact ${supportEmail} or use the Support page.`,
            "Do not share card, UPI PIN, bank password, or other sensitive payment credentials in support messages."
          ]
        }
      ]}
    />
  );
}
