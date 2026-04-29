"use client";

import { useEffect, useState } from "react";

type Member = {
  id: string;
  name: string;
  avatar: string;
  color: string;
};

type Chore = {
  id: string;
  name: string;
  assigned_to: string;
  count: number;
  reward?: number;
};

export default function ChoreBoard({ members }: { members: Member[] }) {
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await fetch("/api/chores");
      const data = await res.json();
      setChores(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load chores:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateCount = async (id: string, action: 'increment' | 'set', value?: number) => {
    // Optimistic update
    setChores((prev) =>
      prev.map((c) =>
        c.id === id 
          ? { ...c, count: action === 'increment' ? c.count + 1 : (value ?? c.count) } 
          : c
      )
    );

    try {
      await fetch("/api/chores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, count: value }),
      });
      load();
    } catch (err) {
      console.error("Failed to update chore count:", err);
      load();
    }
  };

  const handleManualOverride = (e: React.MouseEvent, id: string, current: number) => {
    e.stopPropagation(); // Don't trigger the increment
    const val = prompt("Enter specific number of completions:", current.toString());
    if (val !== null) {
      const num = parseInt(val);
      if (!isNaN(num)) updateCount(id, 'set', num);
    }
  };

  const clearAll = async () => {
    if (!confirm("Are you sure you want to clear all active chores for the week?")) return;
    await fetch("/api/chores", { method: "DELETE" });
    setChores([]);
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
      <div className="flex justify-end">
        <button 
          onClick={clearAll}
          className="px-6 py-2 bg-white border border-red-100 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all shadow-sm"
        >
          Reset Weekly Matrix
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {members.map((m) => (
          <section key={m.id} className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-2xl ${m.color} text-white flex items-center justify-center font-bold text-sm shadow-inner`}>
                    {m.avatar}
                  </div>
                  <div>
                    <h3 className="font-black text-gray-800 text-[10px] tracking-[0.1em] uppercase">{m.name}</h3>
                    <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Active Matrix</div>
                  </div>
               </div>
               <div className="text-[10px] font-black text-emerald-600 tabular-nums bg-emerald-50 px-2 py-1 rounded-lg">
                  ${chores.filter(c => c.assigned_to === m.id).reduce((s, c) => s + (c.count * (c.reward || 0)), 0).toFixed(2)}
               </div>
            </div>
            
            <div className="p-6 flex flex-col gap-3 flex-1">
              {chores
                .filter((c) => c.assigned_to === m.id)
                .map((c) => (
                  <div
                    key={c.id}
                    onClick={() => updateCount(c.id, 'increment')}
                    className="group p-4 rounded-2xl border transition-all flex items-center justify-between bg-white border-gray-100 shadow-sm hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer active:scale-[0.98]"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-black uppercase tracking-tight text-gray-800 group-hover:text-blue-600 transition-colors">
                        {c.name}
                      </span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase mt-0.5 tracking-tighter">
                        Tap to Complete • ${(c.reward || 0).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-xl font-black text-gray-800 tabular-nums min-w-[2ch] text-center">
                        {c.count}
                      </div>
                      <button 
                        onClick={(e) => handleManualOverride(e, c.id, c.count)}
                        className="p-2 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                        title="Manual Override"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      </button>
                    </div>
                  </div>
                ))}
              
              {chores.filter(c => c.assigned_to === m.id).length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 opacity-20 py-12">
                  <div className="text-4xl text-gray-300">📊</div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em]">Node Idle</div>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
