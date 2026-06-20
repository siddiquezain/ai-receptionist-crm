import { UserPlus, Share2, CalendarCheck } from "lucide-react";

const STEPS = [
  {
    number: "01",
    icon: UserPlus,
    title: "Create your account",
    desc: "Sign up in under a minute. Add your business details, services, and working hours. Invite your team with one click.",
  },
  {
    number: "02",
    icon: Share2,
    title: "Share your booking link",
    desc: "Your branded /book/[slug] page and AI chat widget are live instantly. Share the link, embed it on your site, or drop it in your bio.",
  },
  {
    number: "03",
    icon: CalendarCheck,
    title: "Watch bookings roll in",
    desc: "Customers book 24/7 — via form or AI chat. You get instant email alerts, reminders go out automatically, and everything syncs to Google Calendar.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-[var(--surface)] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-14 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--accent)]">
            How it works
          </p>
          <h2 className="text-4xl font-bold text-[var(--text-primary)]">
            Live in minutes, not months
          </h2>
          <p className="mt-4 text-[var(--text-muted)] max-w-xl mx-auto">
            No developer, no integrations nightmare. Just sign up and your booking system is ready.
          </p>
        </div>

        <div className="relative grid gap-8 md:grid-cols-3">
          {/* Connector line (desktop) */}
          <div className="hidden md:block absolute top-12 left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)] h-px bg-gradient-to-r from-[var(--accent)]/20 via-[var(--accent)]/60 to-[var(--accent)]/20" />

          {STEPS.map((step, idx) => (
            <div key={step.number} className="relative flex flex-col items-center text-center">
              {/* Icon circle */}
              <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-full border-2 border-[var(--accent)]/20 bg-[var(--bg)]">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)]/10">
                  <step.icon className="h-7 w-7 text-[var(--accent)]" />
                </div>
                <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">
                  {idx + 1}
                </span>
              </div>

              <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">
                {step.title}
              </h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-xs">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
