import { createClient, createAdminClient } from "@/lib/supabase/server";

async function getStoredGoogleRefreshToken() {
  const adminSupabase = createAdminClient();
  const { data: setting } = await adminSupabase
    .from("household_settings")
    .select("value")
    .eq("key", "google_refresh_token")
    .single();

  return setting?.value || null;
}

async function refreshGoogleAccessToken(refreshToken: string) {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: (process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_SECRET)!,
      }),
    });

    const data = await res.json();
    if (!data.access_token) {
      console.error("Google Token Refresh Failed:", data);
      return null;
    }

    return data.access_token as string;
  } catch (err) {
    console.error("Google Token Refresh Error:", err);
    return null;
  }
}

export async function getGoogleTokens() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const sessionToken = session?.provider_token || null;
  const refreshToken = await getStoredGoogleRefreshToken();
  const storedToken = refreshToken ? await refreshGoogleAccessToken(refreshToken) : null;

  return {
    sessionToken,
    storedToken,
  };
}

export async function getGoogleToken(options?: { preferStored?: boolean }) {
  const { sessionToken, storedToken } = await getGoogleTokens();

  if (options?.preferStored) {
    return storedToken || sessionToken || null;
  }

  return sessionToken || storedToken || null;
}
