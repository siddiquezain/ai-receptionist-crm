import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CtaSection() {
  return (
    <section className="bg-[var(--bg)] py-24">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <div className="rounded-3xl border border-[var(--accent)]/20 bg-gradient-to-br from-[var(--accent)]/8 via-[var(--surface)] to-purple-500/8 p-14">
          <h2 className="text-4xl font-extrabold tracking-tight text-[var(--text-primary)] mb-4">
            Ready to fill your calendar on autopilot?
          </h2>
          <p className="text-lg text-[var(--text-muted)] mb-8 max-w-xl mx-auto">
            Join thousands of businesses using AppointEase to automate bookings,
            reduce no-shows, and grow revenue — starting today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-8 py-4 text-base font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors shadow-lg shadow-[var(--accent)]/25"
            >
              Start your free trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/book/demo"
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-8 py-4 text-base font-semibold text-[var(--text-primary)] hover:bg-[var(--bg)] transition-colors"
            >
              Try a live demo
            </Link>
          </div>
          <p className="mt-5 text-sm text-[var(--text-muted)]">
            No credit card required · 14-day trial on all plans · Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}
