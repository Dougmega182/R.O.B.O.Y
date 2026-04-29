import { createAdminClient, createClient } from "@/lib/supabase/server";
import { logFeedItem } from "@/lib/feed";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const supabase = createAdminClient();
  const url = new URL(req.url);
  const conversationId = url.searchParams.get("conversation_id");

  if (!conversationId) return NextResponse.json({ error: "conversation_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("messages")
    .select("*, household_members(name, avatar, color)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("GET /api/messages Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const supabase = createClient();
  const body = await req.json();

  const { data, error } = await supabase
    .from("messages")
    .insert([{
      content: body.content,
      member_id: body.member_id,
      conversation_id: body.conversation_id
    }])
    .select("*, household_members(name, avatar, color)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update conversation last_message_at
  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", body.conversation_id);

  // Update sender's last_read_at
  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .match({ conversation_id: body.conversation_id, member_id: body.member_id });

  await logFeedItem({
    actorMemberId: body.member_id,
    type: "message",
    title: "New message",
    subtitle: body.content?.slice(0, 80) || "Message sent",
    icon: "💬",
    status: "active",
  });

  return NextResponse.json(data);
}
