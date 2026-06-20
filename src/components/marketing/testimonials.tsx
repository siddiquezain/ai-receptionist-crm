import { Quote } from "lucide-react";

const TESTIMONIALS = [
  {
    quote:
      "Our no-show rate dropped 40% in the first month. The automatic reminders alone paid for the subscription five times over.",
    name: "Priya Nair",
    role: "Owner, Bloom Hair Studio",
    initials: "PN",
    color: "bg-purple-500",
  },
  {
    quote:
      "The AI booking agent handles enquiries while we sleep. We wake up to a full calendar without lifting a finger. Absolutely wild.",
    name: "James Thornton",
    role: "Director, Revive Wellness Spa",
    initials: "JT",
    color: "bg-blue-500",
  },
  {
    quote:
      "We run seven clinic locations under one AppointEase account. Managing all of them from a single dashboard has been a game-changer for our ops team.",
    name: "Dr. Sara Al-Khalidi",
    role: "Operations Lead, MediPoint Clinics",
    initials: "SK",
    color: "bg-emerald-500",
  },
];

export function Testimonials() {
  return (
    <section className="bg-[var(--surface)] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-14 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--accent)]">
            Testimonials
          </p>
          <h2 className="text-4xl font-bold text-[var(--text-primary)]">
            Loved by booking businesses
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-6"
            >
              <Quote className="mb-4 h-6 w-6 text-[var(--accent)]/40" />
              <blockquote className="flex-1 text-[var(--text-primary)] text-sm leading-relaxed mb-6">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${t.color} text-white text-sm font-bold`}
                >
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{t.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
