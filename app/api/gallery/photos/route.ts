import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const supabase = createClient();
  const url = new URL(req.url);
  const albumId = url.searchParams.get("album_id");

  let query = supabase.from("gallery_photos").select("*").order("created_at", { ascending: false });
  if (albumId) query = query.eq("album_id", albumId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const supabase = createClient();
  const body = await req.json();

  if (body.action === "delete") {
    const { error } = await supabase.from("gallery_photos").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const { data, error } = await supabase
    .from("gallery_photos")
    .insert([{ album_id: body.album_id, url: body.url, caption: body.caption }])
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
