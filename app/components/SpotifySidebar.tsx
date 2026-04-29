"use client";

import { useCallback, useEffect, useState } from "react";

type PlayingState = {
  title: string;
  artist: string;
  albumArt: string;
  isPlaying: boolean;
  device?: string;
};

export default function SpotifySidebar() {
  const [playing, setPlaying] = useState<PlayingState | null>(null);
  const [recentlyPlayed, setRecentlyPlayed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"play" | "pause" | "next" | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/spotify?_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setPlaying(data.playing || null);
      }

      const recentRes = await fetch(`/api/spotify?action=recently_played&_t=${Date.now()}`);
      if (recentRes.ok) {
        const recentData = await recentRes.json();
        const unique = Array.from(
          new Map(recentData.map((item: any) => [item.track.id, item])).values()
        );
        setRecentlyPlayed(unique.slice(0, 4) as any[]);
      }
    } catch (err) {
      console.error("Spotify Sidebar Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  const openSpotifyPanel = () => {
    window.history.replaceState({}, "", "/?view=spotify");
    window.dispatchEvent(new CustomEvent("switch-view", { detail: "spotify" }));
  };

  const sendAction = async (action: "play" | "pause" | "next", uri?: string) => {
    setBusy(action);
    try {
      await fetch("/api/spotify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, uri }),
      });
      setTimeout(loadData, 800);
    } catch (err) {
      console.error("Spotify control error:", err);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#1DB954] text-white rounded-xl flex items-center justify-center shadow-lg shadow-[#1DB954]/20">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.494 17.306c-.215.353-.679.467-1.032.252-2.855-1.744-6.45-2.138-10.684-1.17-.404.092-.808-.162-.9-.566-.092-.403.161-.808.566-.9 4.636-1.06 8.598-.606 11.798 1.348.353.215.467.679.252 1.036zm1.466-3.26c-.271.442-.847.584-1.288.314-3.266-2.008-8.246-2.593-12.11-1.419-.497.151-1.02-.132-1.171-.629-.151-.497.132-1.02.629-1.171 4.417-1.341 9.902-.686 13.636 1.606.442.271.584.847.314 1.288zm.13-3.419c-3.917-2.326-10.37-2.541-14.13-1.4c-.6.181-1.237-.162-1.419-.763-.181-.601.162-1.237.763-1.419 4.316-1.31 11.434-1.049 15.952 1.631.54.32.716 1.015.396 1.554-.32.539-1.015.715-1.554.396z"/></svg>
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-800 tracking-tight leading-none mb-0.5">Spotify</h3>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">House Player</p>
          </div>
        </div>
        <button
          onClick={openSpotifyPanel}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-md shadow-gray-900/10"
        >
          Open Audio Panel
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
        {loading ? (
          <div className="animate-pulse text-xs text-gray-400">Loading player...</div>
        ) : playing ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <img src={playing.albumArt} alt="" className="w-20 h-20 rounded-2xl object-cover shadow-md" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black text-[#1DB954] uppercase tracking-widest mb-1">
                  {playing.isPlaying ? "Now Playing" : "Paused"}
                </div>
                <div className="text-sm font-black text-gray-800 truncate">{playing.title}</div>
                <div className="text-xs text-gray-500 truncate">{playing.artist}</div>
                <div className="text-[10px] text-gray-400 mt-1">{playing.device || "Spotify device"}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => sendAction(playing.isPlaying ? "pause" : "play")}
                disabled={busy !== null}
                className="flex-1 py-3 bg-[#1DB954] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#18a449] disabled:opacity-60"
              >
                {busy === "pause" || busy === "play" ? "Working..." : playing.isPlaying ? "Pause" : "Resume"}
              </button>
              <button
                onClick={() => sendAction("next")}
                disabled={busy !== null}
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 disabled:opacity-60"
              >
                Next
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="text-xs font-black text-gray-700 uppercase tracking-widest mb-2">No music playing</div>
            <div className="text-[10px] text-gray-400 mb-4">Open the Audio panel to pick something and control playback.</div>
            <button
              onClick={openSpotifyPanel}
              className="px-4 py-2 bg-[#1DB954] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#18a449]"
            >
              Go To Audio
            </button>
          </div>
        )}
      </div>

      {recentlyPlayed.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Recent Tracks</h4>
          <div className="space-y-2">
            {recentlyPlayed.map((item: any) => (
              <button
                key={item.track.id + item.played_at}
                onClick={() => sendAction("play", item.track.uri)}
                className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-gray-50 text-left transition-all"
              >
                <img src={item.track.album?.images?.[0]?.url} alt="" className="w-10 h-10 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-gray-800 truncate">{item.track.name}</div>
                  <div className="text-[10px] text-gray-400 truncate">
                    {item.track.artists.map((artist: any) => artist.name).join(", ")}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
