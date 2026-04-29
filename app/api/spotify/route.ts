export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";

async function getAccessToken() {
  const { createClient, createAdminClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  const adminSupabase = createAdminClient();
  
  // 1. Try to get the household refresh token first as it's the most reliable for background sync
  const { data: setting } = await adminSupabase
    .from("household_settings")
    .select("value")
    .eq("key", "spotify_refresh_token")
    .single();

  if (setting?.value) {
    try {
      const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: "Basic " + Buffer.from(process.env.SPOTIFY_CLIENT_ID + ":" + process.env.SPOTIFY_CLIENT_SECRET).toString("base64"),
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: setting.value,
        }),
      });

      const data = await res.json();
      if (data.access_token) return data.access_token;
      console.error("Spotify Refresh Token Failed:", data);
    } catch (err) {
      console.error("Spotify Refresh Error:", err);
    }
  }

  // 2. Fallback to the session provider token (user's personal connection)
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.provider_token) return session.provider_token;

  return null;
}

export async function GET(req: Request) {
  const token = await getAccessToken();

  if (!token) {
    return NextResponse.json({ authenticated: false, playing: null });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  if (action === "sdk_token") {
    return NextResponse.json({ authenticated: true, token });
  }

  // --- ACTION: SEARCH ---
  if (action === "search") {
    const q = searchParams.get("q");
    if (!q) return NextResponse.json({ error: "Missing query" }, { status: 400 });
    const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track,album,artist&limit=5`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!searchRes.ok) return NextResponse.json({ error: "Search failed" }, { status: searchRes.status });
    const searchData = await searchRes.json();
    return NextResponse.json(searchData);
  }

  // --- ACTION: RECENTLY PLAYED ---
  if (action === "recently_played") {
    const recentRes = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=10", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!recentRes.ok) return NextResponse.json({ error: "Failed to fetch recently played" }, { status: recentRes.status });
    const recentData = await recentRes.json();
    return NextResponse.json(recentData.items);
  }

  // --- DEFAULT: CURRENTLY PLAYING ---
  const res = await fetch(
    "https://api.spotify.com/v1/me/player?additional_types=track,episode",
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (res.status === 204 || res.status === 404) {
    return NextResponse.json({ authenticated: true, playing: null });
  }

  if (!res.ok) {
    const errText = await res.text();
    console.error("Spotify API Error:", res.status, errText);
    return NextResponse.json({ error: "Spotify API Error", details: errText }, { status: res.status });
  }

  const data = await res.json();
  const isEpisode = data.currently_playing_type === "episode";

  return NextResponse.json({
    authenticated: true,
    playing: {
      title: data.item?.name ?? "Unknown",
      artist: isEpisode ? (data.item?.show?.name ?? "Podcast") : (data.item?.artists?.[0]?.name ?? "Unknown"),
      album: isEpisode ? (data.item?.show?.publisher ?? "") : (data.item?.album?.name ?? ""),
      albumArt: isEpisode ? (data.item?.images?.[0]?.url ?? data.item?.show?.images?.[0]?.url ?? "") : (data.item?.album?.images?.[0]?.url ?? ""),
      isPlaying: data.is_playing,
      link: data.item?.external_urls?.spotify ?? "",
      progressMs: data.progress_ms,
      durationMs: data.item?.duration_ms,
      device: data.device?.name,
      uri: data.item?.uri
    }
  });
}

export async function POST(req: Request) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

  const { action, uri, deviceId } = await req.json();
  
  let endpoint = "";
  let method = "PUT";

  switch (action) {
    case "play": endpoint = "https://api.spotify.com/v1/me/player/play"; break;
    case "pause": endpoint = "https://api.spotify.com/v1/me/player/pause"; break;
    case "next": endpoint = "https://api.spotify.com/v1/me/player/next"; method = "POST"; break;
    default: return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const body = uri && action === "play" ? JSON.stringify({ uris: [uri] }) : undefined;
  let targetDeviceId: string | null = deviceId || null;

  if (action === "play") {
    const devRes = await fetch("https://api.spotify.com/v1/me/player/devices", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (devRes.ok) {
      const devData = await devRes.json();
      const devices = Array.isArray(devData.devices) ? devData.devices : [];
      const chosenDevice =
        (targetDeviceId && devices.find((device: any) => device.id === targetDeviceId && !device.is_restricted)) ||
        devices.find((device: any) => device.is_active && !device.is_restricted) ||
        devices.find((device: any) => !device.is_restricted);

      if (!chosenDevice) {
        return NextResponse.json(
          { error: "No available Spotify device. Open Spotify or wait for the browser player to finish connecting." },
          { status: 409 }
        );
      }

      targetDeviceId = chosenDevice.id;
      const transferRes = await fetch("https://api.spotify.com/v1/me/player", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          device_ids: [targetDeviceId],
          play: false,
        }),
      });

      if (!transferRes.ok && transferRes.status !== 204) {
        const transferError = await transferRes.text();
        return NextResponse.json(
          { error: "Could not activate Spotify device", details: transferError },
          { status: transferRes.status }
        );
      }
    }
  }

  let res = await fetch(endpoint, {
    method,
    headers: { 
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body
  });

  if ((res.status === 404 || res.status === 403) && action === "play" && deviceId) {
    res = await fetch(`${endpoint}?device_id=${targetDeviceId}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body
    });
  }

  if (!res.ok) {
    const errorText = await res.text();
    return NextResponse.json(
      { error: "Spotify playback failed", details: errorText || "Unknown Spotify error" },
      { status: res.status }
    );
  }

  return NextResponse.json({ success: true, deviceId: targetDeviceId });
}
