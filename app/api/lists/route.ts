import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createAdminClient();
  const [{ data, error }, { data: activitySetting }] = await Promise.all([
    supabase
      .from("lists")
      .select("*, list_items(count)")
      .order("created_at"),
    supabase
      .from("household_settings")
      .select("value")
      .eq("key", "activity_lists")
      .maybeSingle(),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let activityListIds: string[] = [];
  try {
    activityListIds = activitySetting?.value ? JSON.parse(activitySetting.value) : [];
  } catch {
    activityListIds = [];
  }

  return NextResponse.json(
    (data ?? []).map((list: any) => ({
      ...list,
      show_in_activity: activityListIds.includes(list.id),
    }))
  );
}

export async function POST(req: Request) {
  const supabase = createAdminClient();
  const body = await req.json();

  if (body.action === "toggle_activity") {
    const { data: activitySetting } = await supabase
      .from("household_settings")
      .select("value")
      .eq("key", "activity_lists")
      .maybeSingle();

    let activityListIds: string[] = [];
    try {
      activityListIds = activitySetting?.value ? JSON.parse(activitySetting.value) : [];
    } catch {
      activityListIds = [];
    }

    const nextIds = body.showInActivity
      ? Array.from(new Set([...activityListIds, body.id]))
      : activityListIds.filter((id: string) => id !== body.id);

    const { error } = await supabase
      .from("household_settings")
      .upsert({ key: "activity_lists", value: JSON.stringify(nextIds) });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, ids: nextIds });
  }

  if (body.action === "delete") {
    await supabase.from("list_items").delete().eq("list_id", body.id);
    const { error } = await supabase.from("lists").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body.action === "update") {
    const { data, error } = await supabase
      .from("lists")
      .update({
        name: body.name,
        icon: body.icon || "📋",
        color: body.color || "#4285f4",
      })
      .eq("id", body.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const { data, error } = await supabase
    .from("lists")
    .insert([{ name: body.name, icon: body.icon || "📋", color: body.color || "#4285f4" }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
