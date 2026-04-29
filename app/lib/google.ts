import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function getGoogleToken() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  // 1. Prioritize session token (user's current session)
  if (session?.provider_token) return session.provider_token;

  // 2. Fallback to household refresh token (background sync / shared view)
  const adminSupabase = createAdminClient();
  const { data: setting } = await adminSupabase
    .from("household_settings")
    .select("value")
    .eq("key", "google_refresh_token")
    .single();

  if (!setting?.value) return null;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: setting.value,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: (process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_SECRET)!,
      }),
    });

    const data = await res.json();
    if (!data.access_token) {
        console.error("Google Token Refresh Failed:", data);
        return null;
    }
    return data.access_token;
  } catch (err) {
    console.error("Google Token Refresh Error:", err);
    return null;
  }
}
