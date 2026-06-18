import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EscalationBannerProps {
  onTakeover: () => void;
  isTakingOver: boolean;
}

export function EscalationBanner({
  onTakeover,
  isTakingOver,
}: EscalationBannerProps) {
  return (
    <div className="flex items-center gap-3 border-b border-[var(--warning)]/30 bg-[var(--warning)]/10 px-4 py-2.5">
      <AlertTriangle className="size-4 shrink-0 text-[var(--warning)]" />
      <p className="flex-1 text-sm text-[var(--warning)]">
        AI needs help — review the conversation and take over.
      </p>
      <Button
        size="sm"
        variant="outline"
        onClick={onTakeover}
        disabled={isTakingOver}
        className="shrink-0 border-[var(--warning)]/40 text-[var(--warning)] hover:bg-[var(--warning)]/10"
      >
        {isTakingOver ? "Taking over…" : "Take over"}
      </Button>
    </div>
  );
}
