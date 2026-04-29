"use client";
import { useEffect, useState } from "react";

type ForecastDay = {
  date: string;
  code: number;
  max: number;
  min: number;
};

export default function WeatherWidget() {
  const [data, setData] = useState<{
    temp: number;
    code: number;
    forecast?: ForecastDay[];
  } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function loadWeather() {
      try {
        const res = await fetch("/api/weather");
        const json = await res.json();
        if (!json.error) setData(json);
      } catch (err) {
        console.error("Weather fetch failed");
      }
    }
    loadWeather();
  }, []);

  const getIcon = (code: number) => {
    if (code === 0) return "☀️";
    if (code <= 3) return "🌤️";
    if (code >= 95) return "⛈️";
    if (code >= 61) return "🌧️";
    return "☁️";
  };

  if (!data) return <div className="w-12 h-4 bg-gray-100 animate-pulse rounded-full" />;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full border border-gray-200 hover:bg-gray-100 transition-all group"
      >
        <span className="text-sm group-hover:scale-110 transition-transform">{getIcon(data.code)}</span>
        <span className="text-xs font-black text-gray-500 uppercase tracking-tighter">{data.temp}°C</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-[2px] flex items-start justify-end p-6" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm bg-white rounded-[2rem] border border-gray-100 shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Weather</div>
                <h3 className="text-xl font-black text-gray-900">7-Day Forecast</h3>
              </div>
              <button onClick={() => setOpen(false)} className="w-9 h-9 rounded-full bg-gray-50 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
                ×
              </button>
            </div>

            <div className="space-y-2">
              {(data.forecast || []).map((day) => (
                <div key={day.date} className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{getIcon(day.code)}</span>
                    <div>
                      <div className="text-sm font-bold text-gray-800">
                        {new Date(day.date).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}
                      </div>
                      <div className="text-[10px] text-gray-400">Eltham</div>
                    </div>
                  </div>
                  <div className="text-sm font-black text-gray-700">
                    {day.max}° <span className="text-gray-400 font-bold">/ {day.min}°</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
