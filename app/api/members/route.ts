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
    const { name, role, color } = await req.json();

    const { data, error } = await supabase
      .from("household_members")
      .insert([{
        name,
        role,
        avatar: name.slice(0, 2),
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

