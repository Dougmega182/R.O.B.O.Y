"use client";

import { useEffect, useState, useCallback } from "react";
import { Member } from "@/lib/members";
import MemberAvatar from "./MemberAvatar";

type Routine = {
  id: string;
  name: string;
  assigned_to: string;
  completed: boolean;
};

export default function RoutinesView({ members }: { members: Member[] }) {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/routines");
      const data = await res.json();
      setRoutines(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load routines:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (id: string, completed: boolean) => {
    // Optimistic Update
    setRoutines(prev => prev.map(r => r.id === id ? { ...r, completed } : r));
    try {
      const res = await fetch("/api/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, completed })
      });
      if (!res.ok) throw new Error("Failed to toggle");
    } catch (err) {
      console.error("Failed to toggle routine:", err);
      // Revert on error
      load();
    }
  };

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset all daily routines for everyone?")) return;
    try {
      await fetch("/api/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" })
      });
      load();
    } catch (err) {
      console.error("Failed to reset routines:", err);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-64 bg-white rounded-2xl border border-gray-100 shadow-sm" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div>
           <h2 className="text-[12px] font-black text-gray-800 uppercase tracking-[0.2em]">Daily Routine Matrix</h2>
           <p className="text-[9px] font-bold text-gray-400 uppercase mt-1 tracking-widest">Habit tracking for the entire household</p>
        </div>
        <button 
          onClick={handleReset}
          className="px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 active:scale-95"
        >
          Daily Global Reset
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {members.map(m => (
          <div key={m.id} className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
             <div className="p-5 bg-gray-50/50 border-b border-gray-100 flex items-center gap-3">
                <MemberAvatar avatar={m.avatar} color={m.color} className="w-10 h-10 rounded-2xl shadow-inner" textClassName="font-bold text-lg" alt={m.name} />
                <div>
                   <h3 className="font-black text-gray-800 text-[10px] tracking-[0.1em] uppercase">{m.name}</h3>
                   <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Habit Node</div>
                </div>
             </div>

             <div className="p-6 flex flex-col gap-2">
                {routines.filter(r => r.assigned_to === m.id).map(r => (
                  <button
                    key={r.id}
                    onClick={() => toggle(r.id, !r.completed)}
                    className={`flex items-center justify-between p-4 rounded-2xl transition-all border ${
                      r.completed 
                        ? "bg-emerald-50 border-emerald-100 text-emerald-800 opacity-60" 
                        : "bg-white border-gray-100 hover:border-blue-200 text-gray-700"
                    }`}
                  >
                    <span className={`text-xs font-black uppercase tracking-tight ${r.completed ? 'line-through' : ''}`}>
                      {r.name}
                    </span>
                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                      r.completed 
                        ? "bg-emerald-500 border-emerald-500 text-white" 
                        : "bg-gray-100 border-gray-200"
                    }`}>
                      {r.completed && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}

                {routines.filter(r => r.assigned_to === m.id).length === 0 && (
                   <div className="py-12 flex flex-col items-center justify-center opacity-20">
                      <div className="text-3xl mb-2">🧘</div>
                      <div className="text-[8px] font-black uppercase tracking-widest text-center">No routines set for {m.name}</div>
                   </div>
                )}
             </div>

             <div className="mt-auto p-4 bg-gray-50/30 border-t border-gray-100 text-center">
                <div className="text-[8px] font-black text-gray-300 uppercase tracking-[0.3em]">
                   {routines.filter(r => r.assigned_to === m.id && r.completed).length} / {routines.filter(r => r.assigned_to === m.id).length} Completed
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
