import { createAdminClient } from "@/lib/supabase/server";
import { logFeedItem } from "@/lib/feed";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createAdminClient();
  
  // Fetch conversations with their participants
  const { data, error } = await supabase
    .from("conversations")
    .select(`
      *,
      conversation_participants(
        member_id,
        last_read_at,
        household_members(name, avatar, color)
      )
    `)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const supabase = createAdminClient();
  const { name, memberIds } = await req.json();

  // 1. Create conversation
  const { data: conv, error: convErr } = await supabase
    .from("conversations")
    .insert([{ name }])
    .select()
    .single();

  if (convErr) return NextResponse.json({ error: convErr.message }, { status: 500 });

  // 2. Add participants
  const participants = memberIds.map((memberId: string) => ({
    conversation_id: conv.id,
    member_id: memberId
  }));

  const { error: partErr } = await supabase
    .from("conversation_participants")
    .insert(participants);

  if (partErr) return NextResponse.json({ error: partErr.message }, { status: 500 });

  await logFeedItem({
    actorMemberId: memberIds?.[0] || null,
    type: "message",
    title: `Conversation created: ${name || "New chat"}`,
    subtitle: `${memberIds.length} participants`,
    icon: "💬",
    status: "active",
  });

  return NextResponse.json(conv);
}
