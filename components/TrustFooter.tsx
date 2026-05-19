import Link from "next/link";

const trustLinks = [
  { href: "/docs", label: "Docs" },
  { href: "/support", label: "Support" },
  { href: "/pricing", label: "Pricing" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/refund-cancellation-policy", label: "Refund / Cancellation" },
  { href: "/digital-delivery-policy", label: "Digital Delivery" }
];

export default function TrustFooter() {
  return (
    <footer className="page-shell pb-8 pt-0">
      <div className="rounded-3xl border border-forge-line bg-white/78 p-5 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="eyebrow">Trust links</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-forge-muted">
              Help, plan terms, payment support, and legal pages in one clean place.
            </p>
          </div>
          <nav className="flex flex-wrap gap-2" aria-label="Trust and support links">
            {trustLinks.map((item) => (
              <Link className="btn-ghost" href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
