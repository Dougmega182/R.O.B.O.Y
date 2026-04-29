import { createAdminClient } from "@/lib/supabase/server";
import { logFeedItem } from "@/lib/feed";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("chores").select("*").order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { id, action, name, assigned_to, reward } = body;
  const supabase = createAdminClient();

  // Create new chore
  if (name && assigned_to) {
    const { data, error } = await supabase
      .from("chores")
      .insert([{ name, assigned_to, reward: reward || 0, count: 0 }])
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logFeedItem({
      actorMemberId: assigned_to,
      type: "task",
      title: `New chore: ${name}`,
      subtitle: "Added to the household chore board",
      icon: "✓",
      status: "pending",
    });
    return NextResponse.json(data);
  }

  // Update existing chore (Counter)
  if (id !== undefined && action) {
    // 1. Get current count
    const { data: current, error: fetchError } = await supabase.from("chores").select("*").eq("id", id).single();
    if (fetchError || !current) return NextResponse.json({ error: "Chore not found" }, { status: 404 });

    let newCount = current.count;
    if (action === 'increment') newCount++;
    else if (action === 'decrement') newCount = Math.max(0, current.count - 1);
    else if (action === 'set') newCount = body.count ?? current.count;
    
    const { data: chore, error: choreError } = await supabase
      .from("chores")
      .update({ count: newCount })
      .eq("id", id)
      .select()
      .single();

    if (choreError) return NextResponse.json({ error: choreError.message }, { status: 500 });

    // 2. If incremented, add reward to budget
    if (action === 'increment' && chore) {
      await supabase.from("transactions").insert([{
        description: `Chore completed: ${chore.name}`,
        amount: chore.reward || 1.00,
        type: "income",
        category: "Chore Reward",
        member_id: chore.assigned_to,
        date: new Date().toISOString().split("T")[0],
        is_spriggy: true
      }]);
      await logFeedItem({
        actorMemberId: chore.assigned_to,
        type: "task",
        title: `Completed chore: ${chore.name}`,
        subtitle: "Reward added to the account",
        icon: "✓",
        status: "active",
      });
    }

    return NextResponse.json(chore);
  }

  return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
}

export async function DELETE() {
  const supabase = createAdminClient();
  const { error } = await supabase.from("chores").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
