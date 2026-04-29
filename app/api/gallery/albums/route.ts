import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("gallery_albums")
    .select("*, gallery_photos(count)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const supabase = createClient();
  const body = await req.json();

  if (body.action === "delete") {
    await supabase.from("gallery_photos").delete().eq("album_id", body.id);
    const { error } = await supabase.from("gallery_albums").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const { data, error } = await supabase
    .from("gallery_albums")
    .insert([{ name: body.name, member_id: body.member_id || null, icon: body.icon || "🖼️" }])
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
