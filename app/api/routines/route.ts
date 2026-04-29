import { createAdminClient, createClient } from "@/lib/supabase/server";
import { logFeedItem } from "@/lib/feed";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("routines").select("*").order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { id, completed, action, name, assigned_to } = body;
  const supabase = createAdminClient();

  // Reset all routines
  if (action === "reset") {
    const { error } = await supabase.from("routines").update({ completed: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Create new routine
  if (name && assigned_to) {
    const { data, error } = await supabase
      .from("routines")
      .insert([{ name, assigned_to, completed: false }])
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logFeedItem({
      actorMemberId: assigned_to,
      type: "reminder",
      title: `New routine: ${name}`,
      subtitle: "Added to household routines",
      icon: "↺",
      status: "pending",
      recurrence: "daily",
    });
    return NextResponse.json(data);
  }

  // Update routine
  if (id !== undefined) {
    const { data, error } = await supabase
      .from("routines")
      .update({ completed })
      .eq("id", id)
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (completed && data) {
      await logFeedItem({
        actorMemberId: data.assigned_to,
        type: "reminder",
        title: `Completed routine: ${data.name}`,
        subtitle: "Routine marked done",
        icon: "↺",
        status: "active",
        recurrence: "daily",
      });
    }
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  const supabase = createClient();
  const { error } = await supabase.from("routines").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
