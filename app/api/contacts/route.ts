import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .order("name");

  if (error) {
    console.error("GET /api/contacts Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const supabase = createAdminClient();
  const body = await req.json();

  if (body.action === "delete") {
    const { error } = await supabase.from("contacts").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const { data, error } = await supabase
    .from("contacts")
    .insert([{
      name: body.name,
      phone: body.phone,
      email: body.email,
      address: body.address,
      category: body.category || "General",
      notes: body.notes,
      avatar_url: body.avatar_url
    }])
    .select().single();
  if (error) {
    console.error("POST /api/contacts Error:", error);
    return NextResponse.json({ 
      error: error.message, 
      details: error.details,
      hint: error.hint,
      code: error.code 
    }, { status: 500 });
  }
  return NextResponse.json(data);
}
