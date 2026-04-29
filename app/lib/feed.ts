import { createAdminClient } from "@/lib/supabase/server";

type FeedLogInput = {
  actorMemberId?: string | null;
  type: "event" | "task" | "message" | "reminder";
  title: string;
  subtitle?: string;
  icon?: string;
  status?: "pending" | "active" | "archived";
  recurrence?: "daily" | "weekly" | "none";
  time?: string;
};

export async function logFeedItem(input: FeedLogInput) {
  try {
    const supabase = createAdminClient();
    const now = new Date();

    await supabase.from("feed_items").insert([
      {
        id: crypto.randomUUID(),
        type: input.type,
        actor_id: input.actorMemberId || null,
        title: input.title,
        subtitle: input.subtitle || null,
        time:
          input.time ||
          now.toLocaleTimeString("en-AU", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        color: "bg-slate-500",
        icon: input.icon || "•",
        status: input.status || "active",
        recurrence: input.recurrence || "none",
        actor_member_id: input.actorMemberId || null,
        updated_at: now.toISOString(),
        created_at: now.toISOString(),
      },
    ]);
  } catch (error) {
    console.error("Feed log error:", error);
  }
}
