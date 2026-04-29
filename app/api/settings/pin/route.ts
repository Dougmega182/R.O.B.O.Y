import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("household_settings")
    .select("value")
    .eq("key", "admin_pin")
    .single();

  if (error || !data) {
    return NextResponse.json({ pin: "1234" }); // Fallback
  }

  return NextResponse.json({ pin: data.value });
}

export async function POST(request: Request) {
  try {
    const { newPin } = await request.json();
    if (!newPin || newPin.length !== 4) {
      return NextResponse.json({ error: "PIN must be 4 digits" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("household_settings")
      .upsert({ key: "admin_pin", value: newPin });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/settings/pin Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
