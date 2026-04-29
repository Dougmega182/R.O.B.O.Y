"use client";

import { useEffect, useState } from "react";
import MemberAvatar from "./MemberAvatar";

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

const toMoneyNumber = (value: unknown) => {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
};

export default function ChoreBoard({ members }: { members: Member[] }) {
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await fetch("/api/chores");
      const data = await res.json();
      setChores(
        Array.isArray(data)
          ? data.map((chore) => ({
              ...chore,
              count: Math.max(0, Math.trunc(toMoneyNumber(chore.count))),
              reward: toMoneyNumber(chore.reward),
            }))
          : []
      );
    } catch (err) {
      console.error("Failed to load chores:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateCount = async (id: string, action: "increment" | "set", value?: number) => {
    // 1. Optimistic Update (Immediate UI feedback)
    setChores((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, count: action === "increment" ? c.count + 1 : (value ?? c.count) }
          : c
      )
    );

    try {
      const res = await fetch("/api/chores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, count: value }),
      });
      
      if (!res.ok) throw new Error("Failed to update");

      const updatedChore = await res.json();
      
      // 2. Exact Sync (Ensure local state matches server's final calculation)
      setChores((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updatedChore } : c))
      );
    } catch (err) {
      console.error("Failed to update chore count:", err);
      // Fallback: reload the whole board if something goes wrong
      load();
    }
  };

  const handleManualOverride = (e: React.MouseEvent, id: string, current: number) => {
    e.stopPropagation();
    const val = prompt("Enter specific number of completions:", current.toString());
    if (val !== null) {
      const num = Number.parseInt(val, 10);
      if (!Number.isNaN(num)) updateCount(id, "set", num);
    }
  };

  const clearAll = async () => {
    if (!confirm("Are you sure you want to clear all active chores for the week?")) return;
    await fetch("/api/chores", { method: "DELETE" });
    setChores([]);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 animate-pulse md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 rounded-2xl border border-gray-100 bg-white shadow-sm" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <button
          onClick={clearAll}
          className="rounded-xl border border-red-100 bg-white px-6 py-2 text-[10px] font-black uppercase tracking-widest text-red-400 shadow-sm transition-all hover:bg-red-50 hover:text-red-600"
        >
          Reset Weekly Matrix
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {members.map((m) => (
          <section key={m.id} className="flex flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 p-5">
              <div className="flex items-center gap-3">
                <MemberAvatar avatar={m.avatar} color={m.color} className="h-9 w-9 rounded-2xl shadow-inner" textClassName="text-sm font-bold" alt={m.name} />
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.1em] text-gray-800">{m.name}</h3>
                  <div className="text-[8px] font-bold uppercase tracking-widest text-gray-400">Active Matrix</div>
                </div>
              </div>
              <div className="rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-black tabular-nums text-emerald-600">
                $
                {chores
                  .filter((c) => c.assigned_to === m.id)
                  .reduce((sum, c) => sum + c.count * toMoneyNumber(c.reward), 0)
                  .toFixed(2)}
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-3 p-6">
              {chores
                .filter((c) => c.assigned_to === m.id)
                .map((c) => (
                  <div
                    key={c.id}
                    onClick={() => updateCount(c.id, "increment")}
                    className="group flex cursor-pointer items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10 active:scale-[0.98]"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-black uppercase tracking-tight text-gray-800 transition-colors group-hover:text-blue-600">
                        {c.name}
                      </span>
                      <span className="mt-0.5 text-[9px] font-bold uppercase tracking-tighter text-gray-400">
                        Tap to Complete • ${toMoneyNumber(c.reward).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="min-w-[2ch] text-center text-xl font-black tabular-nums text-gray-800">{c.count}</div>
                      <button
                        onClick={(e) => handleManualOverride(e, c.id, c.count)}
                        className="rounded-lg p-2 text-gray-300 transition-all hover:bg-blue-50 hover:text-blue-500"
                        title="Manual Override"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      </button>
                    </div>
                  </div>
                ))}

              {chores.filter((c) => c.assigned_to === m.id).length === 0 && (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 opacity-20">
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
