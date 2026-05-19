import type { Metadata } from "next";
import Link from "next/link";
import PublicInfoPage from "@/components/PublicInfoPage";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata: Metadata = {
  title: "Contact | FocusForge",
  description: "Contact FocusForge for support, billing verification, business, and launch-readiness questions."
};

const supportEmail = SUPPORT_EMAIL;

export default function ContactPage() {
  return (
    <>
      <PublicInfoPage
        eyebrow="Contact"
        title="Contact FocusForge."
        subtitle="Use the structured support form for account, payment, and product issues. This page keeps public launch contact details easy to edit."
        updatedLabel="v1.3.0"
        contactCta
        sections={[
          {
            title: "Support email",
            body: [
              `Support email: ${supportEmail}`,
              "For payment verification, include the Razorpay payment ID or order ID, account email, plan, and pass type."
            ],
            bullets: ["Do not send passwords or private keys.", "Use the support form for structured requests.", "Use feedback for beta suggestions and bug reports."]
          },
          {
            title: "Business contact placeholders",
            body: [
              "Business name: MHHORIZON",
              "Business email: mhhorizonhub@gmail.com"
            ]
          }
        ]}
      />
      <div className="page-shell pt-0">
        <div className="card mb-8 p-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link className="btn-primary" href="/support">Open support form</Link>
            <Link className="btn-secondary" href="/feedback">Send feedback</Link>
          </div>
        </div>
      </div>
    </>
  );
}
