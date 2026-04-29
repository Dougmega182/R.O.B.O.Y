import { createAdminClient } from "@/lib/supabase/server";
import { logFeedItem } from "@/lib/feed";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*, household_members(name, avatar, color)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const supabase = createAdminClient();
  const body = await req.json();

  if (body.action === "delete") {
    const { error } = await supabase.from("documents").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body.action === "update") {
    const { data, error } = await supabase
      .from("documents")
      .update({
        name: body.name,
        category: body.category || "General",
      })
      .eq("id", body.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const { data, error } = await supabase
    .from("documents")
    .insert([{
      name: body.name,
      category: body.category || "General",
      url: body.file_url,
      uploaded_by: body.uploaded_by || null
    }])
    .select().single();
  if (error) {
    console.error("POST /api/documents Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  await logFeedItem({
    actorMemberId: body.uploaded_by || null,
    type: "event",
    title: `Document added: ${body.name}`,
    subtitle: `${body.category || "General"} document saved`,
    icon: "📄",
    status: "active",
  });
  return NextResponse.json(data);
}
