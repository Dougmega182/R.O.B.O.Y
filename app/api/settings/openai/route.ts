import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { apiKey } = await req.json();
    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json({ error: "Missing API key." }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("household_settings")
      .upsert({ key: "openai_api_key", value: apiKey });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to save OpenAI key." }, { status: 500 });
  }
}
