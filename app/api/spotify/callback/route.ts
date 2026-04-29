import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(
          process.env.SPOTIFY_CLIENT_ID + ":" + process.env.SPOTIFY_CLIENT_SECRET
        ).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: code!,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    }),
  });

  const data = await tokenRes.json();

  if (data.refresh_token) {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient();
    
    // 🚀 Store the refresh token permanently in the household settings
    await supabase.from("household_settings").upsert({
      key: "spotify_refresh_token",
      value: data.refresh_token,
      updated_at: new Date().toISOString()
    });
  }

  return NextResponse.redirect(new URL("/", req.url));
}

