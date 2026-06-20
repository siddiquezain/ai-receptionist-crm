import Link from "next/link";
import { Calendar } from "lucide-react";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]">
            <Calendar className="h-4 w-4 text-white" />
          </span>
          AppointEase
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-[var(--text-muted)]">
          <a href="#features" className="hover:text-[var(--text-primary)] transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-[var(--text-primary)] transition-colors">How it works</a>
          <a href="#pricing" className="hover:text-[var(--text-primary)] transition-colors">Pricing</a>
        </nav>

        {/* Auth CTAs */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors"
          >
            Get started free
          </Link>
        </div>
      </div>
    </header>
  );
}
