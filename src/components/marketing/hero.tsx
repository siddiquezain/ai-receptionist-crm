import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[var(--surface)] pt-20 pb-28">
      {/* Background grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(var(--text-primary) 1px, transparent 1px), linear-gradient(90deg, var(--text-primary) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Accent blob */}
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-96 w-[900px] rounded-full bg-[var(--accent)]/8 blur-3xl" />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/8 px-4 py-1.5 text-sm font-medium text-[var(--accent)]">
          <Sparkles className="h-3.5 w-3.5" />
          AI-powered booking for every business
        </div>

        {/* Headline */}
        <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight text-[var(--text-primary)] md:text-6xl">
          Appointments on autopilot,{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(135deg, var(--accent), #7c3aed)" }}
          >
            globally
          </span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg text-[var(--text-muted)] leading-relaxed">
          AppointEase gives your business a 24/7 AI receptionist, a public booking page,
          email reminders, Google Calendar sync, and a full analytics dashboard — all under
          one multi-tenant SaaS platform.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/register"
            className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-7 py-3.5 text-base font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors shadow-lg shadow-[var(--accent)]/25"
          >
            Start free trial
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/book/demo"
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-7 py-3.5 text-base font-semibold text-[var(--text-primary)] hover:bg-[var(--bg)] transition-colors"
          >
            See a live demo
          </Link>
        </div>

        <p className="mt-4 text-sm text-[var(--text-muted)]">
          No credit card required · 14-day free trial · Cancel anytime
        </p>
      </div>

      {/* Dashboard mockup */}
      <div className="relative mx-auto mt-16 max-w-5xl px-6">
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] shadow-2xl shadow-black/10">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--bg)] px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-[var(--danger)]/70" />
            <span className="h-3 w-3 rounded-full bg-[var(--warning)]/70" />
            <span className="h-3 w-3 rounded-full bg-[var(--success)]/70" />
            <span className="mx-3 flex-1 rounded-md bg-[var(--border)] px-3 py-1 text-xs text-[var(--text-muted)]">
              app.appointease.com/acme/dashboard
            </span>
          </div>

          {/* Dashboard preview */}
          <div className="bg-[var(--bg)] p-6">
            <div className="mb-4 grid grid-cols-4 gap-3">
              {[
                { label: "Bookings today", value: "24" },
                { label: "This month", value: "312" },
                { label: "Revenue", value: "$8,940" },
                { label: "AI handled", value: "87%" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <p className="text-xs text-[var(--text-muted)]">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 h-32 flex items-end gap-1">
                {[40, 65, 50, 80, 72, 90, 85, 95, 78, 88, 92, 96].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm bg-[var(--accent)]/20"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="text-xs font-medium text-[var(--text-muted)] mb-3">Upcoming</p>
                {["10:00 — Hair cut", "11:30 — Consultation", "2:00 — Deep clean"].map((a) => (
                  <div key={a} className="mb-2 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shrink-0" />
                    <span className="text-xs text-[var(--text-primary)] truncate">{a}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
