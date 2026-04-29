"use client";

import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: {
      Player: new (config: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayer;
    };
  }
}

type SpotifyPlayer = {
  addListener: (event: string, cb: (...args: any[]) => void) => boolean | void;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  activateElement?: () => Promise<void>;
  setVolume?: (volume: number) => Promise<void>;
};

type PlayingState = {
  title: string;
  artist: string;
  album: string;
  albumArt: string;
  isPlaying: boolean;
  link: string;
  progressMs: number;
  durationMs: number;
  device?: string;
  deviceId?: string | null;
  volumePercent?: number | null;
  uri?: string;
};

export default function SpotifyView() {
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState<PlayingState | null>(null);
  const [recentlyPlayed, setRecentlyPlayed] = useState<any[]>([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [browserDeviceId, setBrowserDeviceId] = useState<string | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [volumePercent, setVolumePercent] = useState(80);
  const [isAdjustingVolume, setIsAdjustingVolume] = useState(false);
  const playerRef = useRef<SpotifyPlayer | null>(null);
  const volumeCommitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/spotify?action=overview&_t=${Date.now()}`);
      const data = await res.json();

      setAuthenticated(Boolean(data.authenticated));
      setPlaying(data.playing || null);

      const unique = Array.from(
        new Map(((data.recentlyPlayed || []) as any[]).map((item: any) => [item.track.id, item])).values()
      );
      setRecentlyPlayed(unique as any[]);

      if (typeof data.playing?.volumePercent === "number") {
        setVolumePercent(data.playing.volumePercent);
      }
    } catch (err) {
      console.error("Spotify Data Sync Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    let isCancelled = false;

    const bootPlayer = async () => {
      if (typeof window === "undefined") return;

      const ensureScript = () =>
        new Promise<void>((resolve) => {
          if (window.Spotify) {
            resolve();
            return;
          }

          window.onSpotifyWebPlaybackSDKReady = () => resolve();

          const existing = document.querySelector('script[src="https://sdk.scdn.co/spotify-player.js"]');
          if (existing) return;

          const script = document.createElement("script");
          script.src = "https://sdk.scdn.co/spotify-player.js";
          script.async = true;
          document.body.appendChild(script);
        });

      await ensureScript();
      if (isCancelled || !window.Spotify) return;

      const player = new window.Spotify.Player({
        name: "FamilyWall Player",
        getOAuthToken: async (cb) => {
          const res = await fetch("/api/spotify?action=sdk_token");
          const data = await res.json();
          cb(data.token);
        },
        volume: 0.8,
      });

      playerRef.current = player;

      player.addListener("ready", async ({ device_id }: { device_id: string }) => {
        if (isCancelled) return;
        setBrowserDeviceId(device_id);
        setSdkReady(true);
        setPlayerError(null);
        if (player.activateElement) {
          try {
            await player.activateElement();
          } catch {}
        }
      });

      player.addListener("not_ready", () => {
        setSdkReady(false);
      });

      player.addListener("initialization_error", ({ message }: { message: string }) => {
        setPlayerError(message);
      });

      player.addListener("authentication_error", ({ message }: { message: string }) => {
        setPlayerError(message);
      });

      player.addListener("account_error", ({ message }: { message: string }) => {
        setPlayerError(message);
      });

      await player.connect();
    };

    bootPlayer();

    return () => {
      isCancelled = true;
      if (volumeCommitTimer.current) clearTimeout(volumeCommitTimer.current);
      if (playerRef.current) playerRef.current.disconnect();
      playerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/spotify?action=search&q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data.tracks?.items || []);
      } catch {}
      setIsSearching(false);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handlePlay = async (uri?: string) => {
    const res = await fetch("/api/spotify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "play", uri, deviceId: browserDeviceId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error || "Spotify playback failed");
      return;
    }
    setTimeout(loadData, 1000);
  };

  const handlePause = async () => {
    const res = await fetch("/api/spotify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pause" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error || "Spotify pause failed");
      return;
    }
    setTimeout(loadData, 1000);
  };

  const handleSkip = async () => {
    const res = await fetch("/api/spotify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "next" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error || "Spotify skip failed");
      return;
    }
    setTimeout(loadData, 1000);
  };

  const commitVolume = useCallback(
    async (nextVolume: number) => {
      setIsAdjustingVolume(true);
      try {
        if (playerRef.current?.setVolume) {
          await playerRef.current.setVolume(nextVolume / 100);
        }

        await fetch("/api/spotify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "set_volume",
            volumePercent: nextVolume,
            deviceId: playing?.deviceId || browserDeviceId,
          }),
        });
      } catch (err) {
        console.error("Spotify volume update failed:", err);
      } finally {
        setIsAdjustingVolume(false);
      }
    },
    [browserDeviceId, playing?.deviceId]
  );

  const handleVolumeChange = (nextVolume: number) => {
    setVolumePercent(nextVolume);
    if (volumeCommitTimer.current) clearTimeout(volumeCommitTimer.current);
    volumeCommitTimer.current = setTimeout(() => {
      commitVolume(nextVolume);
    }, 180);
  };

  return (
    <div className="w-full h-full flex flex-col gap-6 font-sans animate-in fade-in duration-500">
      <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-[#1DB954] text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-[#1DB954]/40 relative overflow-hidden group">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.494 17.306c-.215.353-.679.467-1.032.252-2.855-1.744-6.45-2.138-10.684-1.17-.404.092-.808-.162-.9-.566-.092-.403.161-.808.566-.9 4.636-1.06 8.598-.606 11.798 1.348.353.215.467.679.252 1.036zm1.466-3.26c-.271.442-.847.584-1.288.314-3.266-2.008-8.246-2.593-12.11-1.419-.497.151-1.02-.132-1.171-.629-.151-.497.132-1.02.629-1.171 4.417-1.341 9.902-.686 13.636 1.606.442.271.584.847.314 1.288zm.13-3.419c-3.917-2.326-10.37-2.541-14.13-1.4c-.6.181-1.237-.162-1.419-.763-.181-.601.162-1.237.763-1.419 4.316-1.31 11.434-1.049 15.952 1.631.54.32.716 1.015.396 1.554-.32.539-1.015.715-1.554.396z" /></svg>
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-800 tracking-tight leading-none mb-1">Spotify</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Household Player</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${sdkReady ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
            {sdkReady ? "Browser Player Ready" : "Connecting Player"}
          </div>
          <input
            type="text"
            placeholder="Search Spotify Catalog..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-6 py-3 bg-gray-50 border border-gray-200 rounded-2xl w-96 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1DB954]/50 shadow-inner"
          />
        </div>
      </div>

      {playerError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm">
          Spotify browser player error: {playerError}
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)] overflow-hidden">
        <div className="lg:col-span-2 bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-y-auto p-8 flex flex-col gap-8 custom-scrollbar">
          {searchQuery ? (
            <div>
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Search Results</h3>
              {isSearching ? (
                <div className="animate-pulse text-sm text-gray-500">Searching...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchResults.map((track: any) => (
                    <div key={track.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors group cursor-pointer" onClick={() => handlePlay(track.uri)}>
                      <img src={track.album?.images?.[0]?.url} alt="" className="w-12 h-12 rounded-lg shadow-md" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-gray-800 truncate">{track.name}</div>
                        <div className="text-xs text-gray-500 truncate">{track.artists.map((a: any) => a.name).join(", ")}</div>
                      </div>
                      <button className="opacity-0 group-hover:opacity-100 w-8 h-8 bg-[#1DB954] text-white rounded-full flex items-center justify-center shadow-lg transition-all">
                        ▶
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Recently Played</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentlyPlayed.map((item: any) => (
                  <div key={item.track.id + item.played_at} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors group cursor-pointer" onClick={() => handlePlay(item.track.uri)}>
                    <img src={item.track.album?.images?.[0]?.url} alt="" className="w-12 h-12 rounded-lg shadow-md" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-gray-800 truncate">{item.track.name}</div>
                      <div className="text-xs text-gray-500 truncate">{item.track.artists.map((a: any) => a.name).join(", ")}</div>
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 w-8 h-8 bg-[#1DB954] text-white rounded-full flex items-center justify-center shadow-lg transition-all">
                      ▶
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-black rounded-[2rem] border border-gray-800 shadow-2xl p-8 flex flex-col justify-end relative overflow-hidden text-white">
          {playing?.albumArt && (
            <div className="absolute inset-0 opacity-40 mix-blend-overlay">
              <img src={playing.albumArt} alt="" className="w-full h-full object-cover blur-2xl scale-150" />
            </div>
          )}

          <div className="relative z-10 flex flex-col gap-6">
            {playing ? (
              <>
                <div className="text-[10px] font-black text-[#1DB954] uppercase tracking-widest flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#1DB954] rounded-full animate-pulse" />
                  Now Playing on {playing.device || "Cloud"}
                </div>

                <img src={playing.albumArt} alt="" className="w-full aspect-square object-cover rounded-2xl shadow-2xl mb-4" />

                <div>
                  <h3 className="font-black text-2xl truncate leading-none mb-2">{playing.title}</h3>
                  <p className="text-gray-400 font-medium truncate">{playing.artist}</p>
                </div>

                {playing.durationMs > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full transition-all duration-1000 ease-linear"
                        style={{ width: `${(playing.progressMs / playing.durationMs) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-bold text-gray-500">
                      <span>{Math.floor(playing.progressMs / 60000)}:{(Math.floor((playing.progressMs % 60000) / 1000)).toString().padStart(2, "0")}</span>
                      <span>{Math.floor(playing.durationMs / 60000)}:{(Math.floor((playing.durationMs % 60000) / 1000)).toString().padStart(2, "0")}</span>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Volume</span>
                    <span className="text-[10px] font-black text-white">{volumePercent}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleVolumeChange(Math.max(0, volumePercent - 10))}
                      className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all"
                    >
                      -
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={volumePercent}
                      onChange={(e) => handleVolumeChange(Number(e.target.value))}
                      className="flex-1 accent-[#1DB954]"
                    />
                    <button
                      onClick={() => handleVolumeChange(Math.min(100, volumePercent + 10))}
                      className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all"
                    >
                      +
                    </button>
                  </div>
                  {isAdjustingVolume && <div className="mt-2 text-[9px] text-gray-400">Updating volume…</div>}
                </div>

                <div className="flex items-center justify-center gap-6 mt-2">
                  <button onClick={playing.isPlaying ? handlePause : () => handlePlay()} className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      {playing.isPlaying ? <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /> : <path d="M8 5v14l11-7z" />}
                    </svg>
                  </button>
                  <button onClick={handleSkip} className="w-12 h-12 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
                  </button>
                </div>
              </>
            ) : authenticated ? (
              <div className="flex flex-col items-center justify-center text-center gap-4 h-full text-gray-400">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="12" cy="12" r="10"></circle><path d="M8 12h8"></path></svg>
                <div className="text-xs font-black uppercase tracking-widest">Nothing Playing Right Now</div>
                <div className="text-[10px]">
                  Spotify is connected.
                  <br />
                  Pick a recent track, search for something, or wait for the browser player to connect.
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center gap-4 h-full text-gray-400">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"></path><path d="M12 6v6l4 2"></path></svg>
                <div className="text-xs font-black uppercase tracking-widest">Spotify Offline</div>
                <div className="text-[10px]">Spotify is not connected for this household view.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
