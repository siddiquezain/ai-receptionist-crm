import { MessageSquare } from "lucide-react";
import { ConversationListItemRow } from "./conversation-list-item";
import type { ConversationListItem } from "@/lib/inbox-queries";

interface ConversationListProps {
  conversations: ConversationListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-12">
        <MessageSquare className="size-8 text-[var(--border)]" />
        <p className="text-center text-xs text-[var(--text-muted)]">
          No open conversations
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--border)]">
      {conversations.map((conv) => (
        <ConversationListItemRow
          key={conv.id}
          conversation={conv}
          isSelected={conv.id === selectedId}
          onClick={() => onSelect(conv.id)}
        />
      ))}
    </div>
  );
}
