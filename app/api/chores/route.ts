import { createAdminClient } from "@/lib/supabase/server";
import { logFeedItem } from "@/lib/feed";
import { NextResponse } from "next/server";

function toNumber(value: unknown, fallback = 0) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeChore<T extends Record<string, any>>(chore: T) {
  return {
    ...chore,
    reward: toNumber(chore.reward, 0),
    count: Math.max(0, Math.trunc(toNumber(chore.count, 0))),
  };
}

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("chores").select("*").order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(normalizeChore));
}

export async function POST(req: Request) {
  const body = await req.json();
  const { id, action, name, assigned_to, reward } = body;
  const supabase = createAdminClient();

  if (name && assigned_to) {
    const safeReward = toNumber(reward, 0);
    const { data, error } = await supabase
      .from("chores")
      .insert([{ name, assigned_to, reward: safeReward, count: 0 }])
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logFeedItem({
      actorMemberId: assigned_to,
      type: "task",
      title: `New chore: ${name}`,
      subtitle: "Added to the household chore board",
      icon: "✓",
      status: "pending",
    });

    return NextResponse.json(data ? normalizeChore(data) : data);
  }

  if (id !== undefined && action) {
    const { data: current, error: fetchError } = await supabase.from("chores").select("*").eq("id", id).single();
    if (fetchError || !current) {
        console.error("POST /api/chores Fetch Error:", fetchError);
        return NextResponse.json({ error: "Chore not found" }, { status: 404 });
    }

    let newCount = Math.max(0, Math.trunc(toNumber(current.count, 0)));
    if (action === "increment") newCount++;
    else if (action === "decrement") newCount = Math.max(0, newCount - 1);
    else if (action === "set") newCount = Math.max(0, Math.trunc(toNumber(body.count, newCount)));

    const { data: chore, error: choreError } = await supabase
      .from("chores")
      .update({ count: newCount })
      .eq("id", id)
      .select()
      .single();

    if (choreError) {
      console.error("POST /api/chores Update Error:", choreError);
      return NextResponse.json({ error: choreError.message }, { status: 500 });
    }

    const normalizedChore = chore ? normalizeChore(chore) : chore;

    if (action === "increment" && normalizedChore) {
      try {
        const { error: transError } = await supabase.from("transactions").insert([
          {
            description: `Chore completed: ${normalizedChore.name}`,
            amount: normalizedChore.reward,
            type: "income",
            category: "Chore Reward",
            member_id: normalizedChore.assigned_to,
            date: new Date().toISOString().split("T")[0],
            is_spriggy: true,
          },
        ]);
        if (transError) console.error("POST /api/chores Transaction Error:", transError);

        await logFeedItem({
          actorMemberId: normalizedChore.assigned_to,
          type: "task",
          title: `Completed chore: ${normalizedChore.name}`,
          subtitle: "Reward added to the account",
          icon: "✓",
          status: "active",
        });
      } catch (err) {
        console.error("POST /api/chores Logging/Transaction Failed:", err);
        // We continue anyway as the chore was updated
      }
    }

    return NextResponse.json(normalizedChore);
  }

  return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
}

export async function DELETE() {
  const supabase = createAdminClient();
  const { error } = await supabase.from("chores").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
