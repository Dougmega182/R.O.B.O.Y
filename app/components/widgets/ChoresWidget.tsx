"use client";

import { useWidgetData } from "@/lib/hooks/useWidgetData";
import { ChoresResponse, isChoresResponse } from "@/lib/contracts/chores";
import { choresStore } from "@/lib/stores/choresStore";

export default function ChoresWidget() {
  const { data, loading, error, refresh } = useWidgetData<ChoresResponse>(
    "/api/chores",
    isChoresResponse,
    choresStore,
    15000 // Poll every 15 seconds
  );

  const handleStatusCycle = async (id: string, currentStatus: string) => {
    let nextStatus = "Pending";
    if (currentStatus === "Pending") nextStatus = "Done";
    else if (currentStatus === "Done") nextStatus = "Approved";
    else if (currentStatus === "Approved") nextStatus = "Pending";

    try {
      await fetch("/api/chores", {
        method: "POST",
        body: JSON.stringify({ id, status: nextStatus }),
        headers: { "Content-Type": "application/json" },
      });
      refresh();
    } catch (err) {
      console.error("Failed to update chore", err);
    }
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 h-full flex flex-col shadow-2xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white tracking-tight">Daily Chores</h2>
        <button
          onClick={refresh}
          className="text-[10px] uppercase tracking-widest px-3 py-1 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
        >
          Sync Now
        </button>
      </div>

      <div className="flex-1">
        {loading && <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-800/50 rounded-lg animate-pulse" />)}
        </div>}
        
        {error && <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-lg text-red-400 text-sm">
          Connection lost: {error}
        </div>}
        
        {data && data.chores && (
          <ul className="space-y-3">
            {data.chores.map((chore) => (
              <li 
                key={chore.id} 
                onClick={() => handleStatusCycle(chore.id, chore.status)}
                className="group cursor-pointer flex items-center p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-slate-500 hover:bg-slate-800 transition-all active:scale-[0.98]"
              >
                <div className={`w-6 h-6 rounded-lg border-2 mr-4 flex items-center justify-center transition-all ${
                  chore.status === 'Approved' ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 
                  chore.status === 'Done' ? 'bg-amber-500 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]' : 'border-slate-600 group-hover:border-slate-400'
                }`}>
                  {chore.status === 'Approved' && (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {chore.status === 'Done' && (
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  )}
                </div>
                <div className="flex-1">
                  <span className={`text-slate-200 font-medium block ${chore.status === 'Approved' ? 'line-through text-slate-500' : ''}`}>
                    {chore.title}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest bg-slate-900 px-1.5 py-0.5 rounded">u1</span>
                    <span className={`text-[10px] font-bold uppercase ${
                      chore.status === 'Approved' ? 'text-emerald-500' : 
                      chore.status === 'Done' ? 'text-amber-500' : 'text-slate-600'
                    }`}>{chore.status}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 font-mono text-sm">${(chore.value_cents / 100).toFixed(2)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between text-[9px] text-slate-600 uppercase tracking-widest font-bold">
        <span>Simplified State Engine</span>
        <span>Household Verified</span>
      </div>
    </div>
  );
}

