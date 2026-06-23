import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EscalationBannerProps {
  onTakeover: () => void;
  isTakingOver: boolean;
}

export function EscalationBanner({ onTakeover, isTakingOver }: EscalationBannerProps) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5"
      style={{
        background: "var(--warning-subtle)",
        borderBottom: "1px solid var(--warning-subtle-border)",
      }}
    >
      <AlertTriangle className="size-4 shrink-0" style={{ color: "var(--warning)" }} />
      <p className="flex-1 text-sm font-medium" style={{ color: "var(--warning)" }}>
        AI needs help — review the conversation and take over.
      </p>
      <Button
        size="sm"
        variant="outline"
        onClick={onTakeover}
        disabled={isTakingOver}
        className="shrink-0"
        style={{
          borderColor: "var(--warning-subtle-border)",
          color: "var(--warning)",
        }}
      >
        {isTakingOver ? "Taking over…" : "Take over"}
      </Button>
    </div>
  );
}
