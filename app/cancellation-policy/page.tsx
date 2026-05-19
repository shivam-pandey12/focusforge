import type { Metadata } from "next";
import PublicInfoPage from "@/components/PublicInfoPage";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata: Metadata = {
  title: "Cancellation Policy | FocusForge",
  description: "Cancellation guidance for FocusForge access periods while Razorpay Orders are used."
};

const supportEmail = SUPPORT_EMAIL;

export default function CancellationPolicyPage() {
  return (
    <PublicInfoPage
      eyebrow="Cancellation Policy"
      title="Access periods are simple in this version."
      subtitle="FocusForge currently uses Razorpay Orders for fixed monthly, season, and yearly access periods, not automatic recurring subscriptions."
      updatedLabel="v1.3.0"
      sections={[
        {
          title: "Current MVP billing model",
          body: [
            "A monthly pass currently means 30 days of access. A season pass currently means 4 months of access. Yearly paid access currently means 365 days.",
            "Monthly, season, and yearly passes are fixed access periods created through Razorpay Orders.",
            "Automatic subscription cancellation is not available until true recurring subscriptions are added."
          ]
        },
        {
          title: "What happens when access ends",
          body: [
            "If a paid access period expires, effective access returns to Free and your data remains safe.",
            "Upgrading again can unlock paid-plan data and features according to the plan rules."
          ]
        },
        {
          title: "Support handling",
          body: [
            "For accidental payments, failed activation, or access questions, use the support form with Razorpay payment details.",
            `Support contact: ${supportEmail}.`
          ]
        }
      ]}
    />
  );
}
