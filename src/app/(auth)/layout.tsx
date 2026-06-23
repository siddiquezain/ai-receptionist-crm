export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--bg)" }}
    >
      {/* Subtle grid background */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)",
          backgroundSize: "32px 32px",
          opacity: 0.4,
        }}
      />

      <div className="relative w-full max-w-[360px]">
        {/* Brand mark */}
        <div className="mb-6 flex items-center gap-2.5">
          <div
            className="flex size-8 items-center justify-center rounded-[var(--radius-md)] text-xs font-bold text-white"
            style={{ background: "var(--accent)" }}
          >
            A
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Appointment SaaS
          </span>
        </div>

        {children}
      </div>
    </div>
  );
}
