import type { Metadata } from "next";
import PublicInfoPage from "@/components/PublicInfoPage";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy | FocusForge",
  description: "Combined refund and cancellation guidance for FocusForge paid digital access."
};

const supportEmail = SUPPORT_EMAIL;

export default function RefundCancellationPolicyPage() {
  return (
    <PublicInfoPage
      eyebrow="Refund / Cancellation"
      title="Refunds and cancellations are handled carefully."
      subtitle="FocusForge currently uses fixed digital access periods through Razorpay Orders, not automatic recurring subscriptions."
      updatedLabel="v1.3.1"
      sections={[
        {
          title: "Digital access purchases",
          body: [
            "Paid plans unlock Pro or Elite features for a fixed access period after successful Razorpay payment verification.",
            "Current access periods may include monthly, 4-month season, and yearly passes depending on the pricing page."
          ]
        },
        {
          title: "Refund requests",
          body: [
            "Refund eligibility may depend on duplicate payments, accidental charges, failed activation, applicable law, Razorpay status, and support review.",
            "If money was deducted but paid access did not activate, first use Refresh billing status from Billing, then contact support with your account email and Razorpay payment/order ID."
          ]
        },
        {
          title: "Cancellation model",
          body: [
            "FocusForge does not currently run automatic recurring subscriptions in this build.",
            "A paid pass continues until its expiry date once activated. When it expires, effective access returns to Starter/Free without deleting study data."
          ]
        },
        {
          title: "How to contact support",
          body: [
            `Use the Support page or email ${supportEmail} for refund, cancellation, duplicate-payment, or failed-activation questions.`,
            "Do not include UPI PINs, card passwords, OTPs, or other sensitive banking credentials in support messages."
          ]
        }
      ]}
    />
  );
}
