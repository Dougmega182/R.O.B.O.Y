import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("household_members")
      .select("*")
      .eq("is_active", true)
      .order("created_at");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const supabase = createClient();
  try {
    const body = await req.json();

    if (body.action === "update_avatar") {
      const { data, error } = await supabase
        .from("household_members")
        .update({ avatar: body.avatar })
        .eq("id", body.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

    const { name, role, color, avatar } = body;

    const { data, error } = await supabase
      .from("household_members")
      .insert([{
        name,
        role,
        avatar: avatar || name.slice(0, 2),
        color: color || (role === 'ADMIN' ? 'bg-pink-500' : 'bg-blue-500')
      }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const supabase = createClient();
  try {
    const { id } = await req.json();
    const { error } = await supabase
      .from("household_members")
      .update({ is_active: false })
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

