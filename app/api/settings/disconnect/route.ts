import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { provider } = await req.json();
    const adminSupabase = createAdminClient();
    
    if (provider === 'spotify') {
      await adminSupabase.from("household_settings").delete().eq("key", "spotify_refresh_token");
    } else if (provider === 'google') {
      await adminSupabase.from("household_settings").delete().eq("key", "google_refresh_token");
    }
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
