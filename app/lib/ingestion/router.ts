import { FeedItem } from "../types/feed";

export type IngestionSource =
  | { type: "MANUAL_FORM"; payload: Partial<FeedItem> }
  | { type: "CALENDAR_SYNC"; payload: { summary: string; start: string; organizer: string } }
  | { type: "SYSTEM_ALERT"; payload: { message: string; priority: "high" | "low" } };

export const ingestFeedItem = (source: IngestionSource): FeedItem => {
  const now = new Date();
  const id = Math.random().toString(36).substring(2, 15);

  let normalized: FeedItem = {
    id,
    type: "message",
    actorMemberId: "system",
    actor: "System",
    role: "Operational Node",
    avatar: "⚙️",
    title: "New Item",
    time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    color: "#94a3b8",
    icon: "🔔",
    status: "pending",
    updatedAt: now.toISOString(),
  };

  switch (source.type) {
    case "MANUAL_FORM":
      normalized = { ...normalized, ...source.payload };
      break;

    case "CALENDAR_SYNC":
      normalized = {
        ...normalized,
        type: "event",
        actorMemberId: source.payload.organizer.toLowerCase(),
        actor: source.payload.organizer,
        title: source.payload.summary,
        subtitle: `Sync from External Calendar`,
        time: new Date(source.payload.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        color: "#8e24aa",
        icon: "📅",
      };
      break;

    case "SYSTEM_ALERT":
      normalized = {
        ...normalized,
        type: "reminder",
        title: source.payload.message,
        color: source.payload.priority === "high" ? "#ef4444" : "#f59e0b",
        icon: "⚠️",
      };
      break;
  }

  return normalized;
};
