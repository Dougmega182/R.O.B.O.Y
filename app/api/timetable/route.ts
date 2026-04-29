import { createAdminClient } from "@/lib/supabase/server";
import { logFeedItem } from "@/lib/feed";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const supabase = createAdminClient();
  const url = new URL(req.url);
  const memberId = url.searchParams.get("member_id");

  let query = supabase.from("timetable_entries").select("*").order("day_of_week").order("start_time");
  if (memberId) query = query.eq("member_id", memberId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const supabase = createAdminClient();
  const body = await req.json();

  if (body.action === "delete") {
    const { error } = await supabase.from("timetable_entries").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body.action === "update") {
    const { data, error } = await supabase
      .from("timetable_entries")
      .update({
        member_id: body.member_id,
        title: body.title,
        day_of_week: body.day_of_week,
        start_time: body.start_time,
        end_time: body.end_time,
        color: body.color || "#4285f4",
        is_alternating: body.is_alternating || false,
        week_pattern: body.week_pattern || "every",
      })
      .eq("id", body.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (body.action === "import") {
    const entries = Array.isArray(body.entries) ? body.entries : [];
    if (entries.length === 0) {
      return NextResponse.json({ error: "No timetable entries supplied." }, { status: 400 });
    }

    if (body.clearForMemberId) {
      const { error: clearError } = await supabase
        .from("timetable_entries")
        .delete()
        .eq("member_id", body.clearForMemberId);

      if (clearError) return NextResponse.json({ error: clearError.message }, { status: 500 });
    }

    const payload = entries.map((entry: any) => ({
      member_id: entry.member_id,
      title: entry.title,
      day_of_week: entry.day_of_week,
      start_time: entry.start_time,
      end_time: entry.end_time,
      color: entry.color || "#4285f4",
      is_alternating: entry.is_alternating || false,
      week_pattern: entry.week_pattern || "every",
    }));

    const { data, error } = await supabase
      .from("timetable_entries")
      .insert(payload)
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logFeedItem({
      actorMemberId: body.clearForMemberId || payload[0]?.member_id || null,
      type: "event",
      title: `Timetable imported`,
      subtitle: `${payload.length} entries added`,
      icon: "🗓",
      status: "active",
      recurrence: "weekly",
    });

    return NextResponse.json(data ?? []);
  }

  const { data, error } = await supabase
    .from("timetable_entries")
    .insert([{
      member_id: body.member_id,
      title: body.title,
      day_of_week: body.day_of_week,
      start_time: body.start_time,
      end_time: body.end_time,
      color: body.color || "#4285f4",
      is_alternating: body.is_alternating || false,
      week_pattern: body.week_pattern || "every"
    }])
    .select().single();
  if (error) {
    console.error("POST /api/timetable Error:", error);
    return NextResponse.json({ 
      error: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    }, { status: 500 });
  }
  await logFeedItem({
    actorMemberId: data.member_id,
    type: "event",
    title: `Timetable updated: ${data.title}`,
    subtitle: `${data.start_time} - ${data.end_time}`,
    icon: "🗓",
    status: "active",
    recurrence: data.is_alternating ? "weekly" : "none",
  });
  return NextResponse.json(data);
}
