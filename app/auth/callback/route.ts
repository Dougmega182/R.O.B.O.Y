import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  // Intelligently force redirects to localhost
  const getRedirectUrl = (target: string) => {
    try {
      // If target is a full URL, only take the path and query
      const targetUrl = new URL(target, "http://localhost:3000");
      return `http://localhost:3000${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
    } catch (e) {
      // Fallback for relative paths
      return `http://localhost:3000${target.startsWith('/') ? target : '/' + target}`;
    }
  };

  if (!code) {
    return NextResponse.redirect(getRedirectUrl("/login"));
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  
  if (!error && data.session) {
    const { provider_refresh_token } = data.session;
    
    if (provider_refresh_token) {
      const { createAdminClient } = await import("@/lib/supabase/server");
      const adminSupabase = createAdminClient();
      
      const provider = url.searchParams.get("provider");
      if (provider === 'spotify') {
        // Explicitly delete old tokens first in case the column isn't uniquely constrained
        await adminSupabase.from("household_settings").delete().eq("key", "spotify_refresh_token");
        await adminSupabase.from("household_settings").insert({ 
          key: "spotify_refresh_token", 
          value: provider_refresh_token 
        });
      } else if (provider === 'google') {
        await adminSupabase.from("household_settings").delete().eq("key", "google_refresh_token");
        await adminSupabase.from("household_settings").insert({ 
          key: "google_refresh_token", 
          value: provider_refresh_token 
        });
      }
    }

    return NextResponse.redirect(getRedirectUrl(next));
  }

  return NextResponse.redirect(getRedirectUrl("/login?error=auth_failed"));
}
