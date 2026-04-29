"use client";

import { useEffect, useState } from "react";

export default function SpotifyWidget() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSpotify() {
      try {
        const res = await fetch(`/api/spotify?_t=${Date.now()}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Spotify Widget Error:", err);
      } finally {
        setLoading(false);
      }
    }
    
    loadSpotify();
    const interval = setInterval(loadSpotify, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading || !data?.authenticated || !data?.playing) return null;

  const { playing } = data;

  return (
    <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-full pl-1.5 pr-4 py-1.5 shadow-sm hover:shadow-md transition-all group">
      <div className="relative">
        <img 
          src={playing.albumArt} 
          alt="Album Art" 
          className="w-7 h-7 rounded-full animate-[spin_8s_linear_infinite] shadow-sm" 
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-white rounded-full shadow-inner" />
        </div>
      </div>
      
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="text-blue-500 text-[10px] animate-pulse">♫</span>
          <span className="text-[10px] font-black text-gray-700 truncate max-w-[120px] uppercase tracking-tighter">
            {playing.title}
          </span>
        </div>
        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none">
          {playing.artist}
        </span>
      </div>
    </div>
  );
}

