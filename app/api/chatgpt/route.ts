import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getOpenAIKey() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("household_settings")
    .select("value")
    .eq("key", "openai_api_key")
    .single();

  return data?.value || process.env.OPENAI_KEY || process.env.VITE_OPENAI_KEY || null;
}

export async function GET() {
  const apiKey = await getOpenAIKey();
  return NextResponse.json({ configured: Boolean(apiKey) });
}

export async function POST(req: Request) {
  const apiKey = await getOpenAIKey();
  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI is not configured in Admin settings." }, { status: 503 });
  }

  try {
    const { messages } = await req.json();
    const safeMessages = Array.isArray(messages) ? messages : [];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: safeMessages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "OpenAI request failed." },
        { status: response.status }
      );
    }

    const content = data?.choices?.[0]?.message?.content || "";
    return NextResponse.json({ content });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "OpenAI request failed." }, { status: 500 });
  }
}
