import { createAdminClient } from "@/lib/supabase/server";
import { logFeedItem } from "@/lib/feed";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("list_items")
    .select("*")
    .eq("list_id", params.id)
    .order("completed")
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createAdminClient();
  const body = await req.json();

  // Toggle complete
  if (body.action === "toggle") {
    const { data: existingItem } = await supabase
      .from("list_items")
      .select("content")
      .eq("id", body.itemId)
      .single();

    const { data, error } = await supabase
      .from("list_items")
      .update({ completed: body.completed })
      .eq("id", body.itemId)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (body.completed) {
      const { data: listData } = await supabase.from("lists").select("name").eq("id", params.id).single();
      await logFeedItem({
        type: "task",
        title: `Completed list item: ${existingItem?.content || "Task"}`,
        subtitle: `From ${listData?.name || "a list"}`,
        icon: "📝",
        status: "active",
      });
    }

    return NextResponse.json(data);
  }

  // Delete item
  if (body.action === "delete") {
    const { error } = await supabase.from("list_items").delete().eq("id", body.itemId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Add new item
  const { data, error } = await supabase
    .from("list_items")
    .insert([{ list_id: params.id, content: body.text, completed: false }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data: listData } = await supabase.from("lists").select("name").eq("id", params.id).single();
  await logFeedItem({
    type: "task",
    title: `Added to list: ${body.text}`,
    subtitle: `In ${listData?.name || "a list"}`,
    icon: "📝",
    status: "pending",
  });
  return NextResponse.json(data);
}
