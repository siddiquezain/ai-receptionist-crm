import {
  Bot,
  CalendarDays,
  BarChart3,
  Mail,
  RefreshCw,
  CreditCard,
  Globe,
  Users,
} from "lucide-react";

const FEATURES = [
  {
    icon: Bot,
    title: "AI Booking Agent",
    desc: "A 24/7 conversational AI that checks availability, gathers customer details, and creates appointments — all via natural language chat.",
  },
  {
    icon: CalendarDays,
    title: "Public Booking Page",
    desc: "Every business gets a branded /book/[slug] URL. Customers pick a service, date, and time in a clean multi-step flow — no account needed.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    desc: "Revenue trends, peak-hour heatmaps, AI performance metrics, service breakdown, and staff performance — all in one view.",
  },
  {
    icon: Mail,
    title: "Email Notifications",
    desc: "Automatic confirmations sent the moment a booking is made. 24-hour and 1-hour reminders keep no-shows low, while staff get instant alerts.",
  },
  {
    icon: RefreshCw,
    title: "Google Calendar Sync",
    desc: "Bidirectional sync keeps your schedule unified. Appointments appear in Google Calendar; events in Google block slots on your booking page.",
  },
  {
    icon: CreditCard,
    title: "Built-in Billing",
    desc: "Stripe-powered subscriptions with a 14-day trial, monthly/annual toggle, and a self-service billing portal. Upgrade or cancel anytime.",
  },
  {
    icon: Globe,
    title: "Multi-tenant & Global",
    desc: "Run multiple businesses or franchise locations under one account. Each tenant has its own slug, services, team, and calendar.",
  },
  {
    icon: Users,
    title: "Team Management",
    desc: "Invite staff with role-based access (Owner, Admin, Staff). Assign services and set per-member working hours and calendars.",
  },
];

export function Features() {
  return (
    <section id="features" className="bg-[var(--bg)] py-24">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="mb-14 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--accent)]">
            Features
          </p>
          <h2 className="text-4xl font-bold text-[var(--text-primary)]">
            Everything your booking business needs
          </h2>
          <p className="mt-4 text-[var(--text-muted)] max-w-xl mx-auto">
            From AI to analytics, we&apos;ve built every layer of the stack so you can focus on serving your customers.
          </p>
        </div>

        {/* Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--accent)]/40 hover:shadow-sm transition-all"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-white transition-colors">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 font-semibold text-[var(--text-primary)]">{f.title}</h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
