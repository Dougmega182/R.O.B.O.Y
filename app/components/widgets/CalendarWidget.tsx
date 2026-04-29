"use client";

import { useWidgetData } from "@/lib/hooks/useWidgetData";
import { CalendarResponse, isCalendarResponse } from "@/lib/contracts/calendar";
import { calendarStore } from "@/lib/stores/calendarStore";

export default function CalendarWidget() {
  const { data, loading, error, refresh } = useWidgetData<CalendarResponse>(
    "/api/calendar",
    isCalendarResponse,
    calendarStore,
    30000 // Poll every 30 seconds for calendar
  );

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white">Master Schedule</h2>
        <button
          onClick={refresh}
          className="text-sm px-3 py-1 bg-slate-800 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
        {loading && <p className="animate-pulse">Loading...</p>}
        {error && <p className="text-red-400">Error: {error}</p>}
        
        {data && data.events && (
          <ul className="w-full space-y-3 mt-2">
            {data.events.map((event, i) => (
              <li key={i} className="flex justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
                <span className="text-slate-200">{event.title}</span>
                <span className="text-slate-500 font-mono">{event.time}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

