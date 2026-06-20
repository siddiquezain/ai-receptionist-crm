import Link from "next/link";
import { Calendar } from "lucide-react";

const LINKS = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "How it works", href: "#how-it-works" },
  ],
  Developers: [
    { label: "API Docs", href: "#" },
    { label: "Webhooks", href: "#" },
    { label: "Status", href: "#" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Contact", href: "#" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "GDPR", href: "#" },
  ],
};

export function LandingFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-5">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-bold text-[var(--text-primary)] mb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)]">
                <Calendar className="h-3.5 w-3.5 text-white" />
              </span>
              AppointEase
            </Link>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              AI-powered appointment booking for businesses of all sizes.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([category, links]) => (
            <div key={category}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {category}
              </p>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[var(--border)] pt-8">
          <p className="text-xs text-[var(--text-muted)]">
            © {new Date().getFullYear()} AppointEase. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
            <span>Made with care for global businesses</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
