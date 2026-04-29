"use client";
import { useEffect, useState, useCallback } from "react";
import { Member } from "@/lib/members";
import MemberAvatar from "./MemberAvatar";

type Transaction = {
  id: string; description: string; amount: number; type: "income" | "expense";
  category: string; member_id?: string; date: string; is_spriggy: boolean; created_at: string;
};

const CATEGORIES = ["General", "Groceries", "Bills", "Transport", "Entertainment", "Medical", "Education", "Clothing", "Spriggy Top-up", "Pocket Money", "Spriggy Income"];

const AUD = (n: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

export default function BudgetView({ members }: { members: Member[] }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [openingBalances, setOpeningBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [tab, setTab] = useState<"all" | "spriggy">("all");
  const [form, setForm] = useState({ description: "", amount: "", type: "expense" as "income" | "expense", category: "General", member_id: "", date: new Date().toISOString().split("T")[0], is_spriggy: false });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const month = String(now.getMonth() + 1);
      const year = String(now.getFullYear());
      const [transactionsRes, metaRes] = await Promise.all([
        fetch("/api/budget"),
        fetch("/api/rewards-meta"),
      ]);
      const data = await transactionsRes.json();
      const meta = await metaRes.json();
      setTransactions(Array.isArray(data) ? data : []);
      setOpeningBalances(meta?.openingBalances || {});
    } catch (err) {
      console.error("Failed to load budget:", err);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim() || !form.amount) return;
    await fetch("/api/budget", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) })
    });
    setForm({ description: "", amount: "", type: "expense", category: "General", member_id: "", date: new Date().toISOString().split("T")[0], is_spriggy: false });
    setShowAdd(false);
    load();
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/budget", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
    load();
  };

  const filtered = tab === "spriggy" ? transactions.filter(t => t.is_spriggy) : transactions;
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const currentMonthTransactions = filtered.filter((t) => t.date.startsWith(currentMonthKey));

  // Calculate per-member totals
  const memberStats = members.map(m => {
    const memberTx = transactions.filter(t => t.member_id === m.id);
    const memberMonthTx = memberTx.filter((t) => t.date.startsWith(currentMonthKey));
    const income = memberTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expenses = memberTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const monthIncome = memberMonthTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const monthExpenses = memberMonthTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const opening = Number(openingBalances[m.id] || 0);
    return {
      ...m,
      income,
      expenses,
      monthBalance: monthIncome - monthExpenses,
      balance: opening + income - expenses
    };
  });

  const totalIncome = filtered.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = filtered.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const categoryBreakdown = currentMonthTransactions.filter(t => t.type === "expense").reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  const sortedCategories = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1]);
  const maxCat = sortedCategories.length > 0 ? sortedCategories[0][1] : 1;

  return (
    <div className="flex gap-6 h-full">
      <div className="flex-1 flex flex-col gap-6">
        {/* Member Reward Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {memberStats.map(m => (
            <div key={m.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow group">
               <div className="flex items-center gap-3 mb-4">
                  <MemberAvatar avatar={m.avatar} color={m.color} className="w-10 h-10 rounded-xl shadow-inner group-hover:scale-110 transition-transform" textClassName="font-bold text-lg" alt={m.name} />
                  <div>
                    <h4 className="font-black text-gray-800 text-sm">{m.name}</h4>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{m.role}</div>
                  </div>
               </div>
               <div className="space-y-1">
                  <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Current Month</div>
                  <div className="text-xl font-black text-gray-800">{AUD(m.monthBalance)}</div>
               </div>
               <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Lifetime Balance</span>
                  <span className={`text-xs font-black ${m.balance >= 0 ? "text-emerald-600" : "text-red-500"}`}>{AUD(m.balance)}</span>
               </div>
            </div>
          ))}
          
          {/* Household Aggregate Card */}
          <div className="bg-slate-900 rounded-2xl p-5 shadow-xl text-white flex flex-col justify-between">
             <div>
               <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Household Node</div>
               <div className="text-3xl font-black text-white">{AUD(totalIncome - totalExpenses)}</div>
               <div className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">Lifetime Household Balance</div>
             </div>
             <div className="flex items-center gap-2 mt-6">
                <div className="w-6 h-6 bg-white/10 rounded-lg flex items-center justify-center text-[10px]">💰</div>
                <div className="text-[9px] font-bold text-slate-400">Synced across {members.length} members</div>
             </div>
          </div>
        </div>

        {/* Tab Bar + Add */}
        <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-gray-100">
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button onClick={() => setTab("all")} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tab === "all" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Ledger</button>
            <button onClick={() => setTab("spriggy")} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${tab === "spriggy" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              <span className="w-4 h-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-[8px] font-bold">S</span>
              Spriggy
            </button>
          </div>
          <button onClick={() => { setShowAdd(!showAdd); setForm({ ...form, is_spriggy: tab === "spriggy" }); }}
            className="px-6 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add Transaction
          </button>
        </div>

        {/* Add Form */}
        {showAdd && (
          <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-gray-200 p-8 flex flex-col gap-6 shadow-sm animate-in slide-in-from-top-4 duration-300">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Manual Entry</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</label>
                <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What for?" className="w-full text-sm bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20" autoFocus />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount ($)</label>
                <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" className="w-full text-sm bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })} className="w-full text-sm bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                  <option value="expense">Expense (-)</option><option value="income">Income (+)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full text-sm bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full text-sm bg-gray-50 border border-gray-100 rounded-xl px-4 py-3" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Assign Member</label>
                <select value={form.member_id} onChange={e => setForm({ ...form, member_id: e.target.value })} className="w-full text-sm bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                  <option value="">Whole House</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
              <label className="flex items-center gap-3 text-xs font-bold text-gray-600 cursor-pointer group">
                <input type="checkbox" checked={form.is_spriggy} onChange={e => setForm({ ...form, is_spriggy: e.target.checked })} className="w-5 h-5 rounded-lg border-gray-200 text-purple-600 focus:ring-purple-500" />
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white text-[9px] font-bold">S</span>
                  <span>Sync with Spriggy Account</span>
                </div>
              </label>
              <div className="flex gap-3">
                 <button type="button" onClick={() => setShowAdd(false)} className="px-8 py-3 bg-gray-100 text-gray-500 rounded-xl font-black text-[10px] uppercase tracking-widest">Cancel</button>
                 <button type="submit" className="px-10 py-3 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 shadow-xl shadow-blue-500/20">Save Transaction</button>
              </div>
            </div>
          </form>
        )}

        {/* Transaction List */}
        <div className="bg-white rounded-2xl border border-gray-200 flex-1 overflow-y-auto shadow-sm">
          {loading ? (
            <div className="p-24 text-center animate-pulse flex flex-col items-center gap-4">
               <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
               <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Syncing Ledger...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-24 text-center flex flex-col items-center gap-4">
              <div className="text-5xl opacity-20">💰</div>
              <div>
                <h3 className="text-lg font-black text-gray-800">No transactions recorded</h3>
                <p className="text-xs text-gray-400 font-bold max-w-xs mx-auto mt-2 uppercase tracking-widest">Complete chores or add manual entries to populate your family ledger.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              <div className="grid grid-cols-[1fr_auto_100px_40px] px-8 py-4 bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                 <span>Transaction Detail</span>
                 <span className="text-center">Member</span>
                 <span className="text-right">Amount</span>
                 <span />
              </div>
              {filtered.map(t => {
                const member = members.find(m => m.id === t.member_id);
                return (
                  <div key={t.id} className="grid grid-cols-[1fr_auto_100px_40px] items-center gap-4 px-8 py-4 hover:bg-gray-50/80 transition-all group">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black shadow-sm ${t.type === "income" ? "bg-emerald-500" : "bg-rose-400"}`}>
                        {t.type === "income" ? "+" : "-"}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-gray-800 flex items-center gap-2 truncate">
                          {t.description}
                          {t.is_spriggy && <span className="w-4 h-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-[7px] font-bold">S</span>}
                        </div>
                        <div className="text-[10px] text-gray-400 font-bold flex items-center gap-2 uppercase tracking-widest">
                          <span>{t.category}</span>
                          <span>·</span>
                          <span>{new Date(t.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-center">
                       {member ? (
                         <MemberAvatar avatar={member.avatar} color={member.color} className="w-8 h-8 rounded-lg shadow-sm" textClassName="text-[10px] font-black" alt={member.name} />
                       ) : (
                         <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center text-[10px] font-black shadow-sm" title="Household">
                           🏠
                         </div>
                       )}
                    </div>

                    <div className={`text-sm font-black text-right tabular-nums ${t.type === "income" ? "text-emerald-600" : "text-rose-500"}`}>
                      {t.type === "income" ? "" : "-"}{AUD(t.amount)}
                    </div>

                    <div className="flex justify-end">
                      <button onClick={() => handleDelete(t.id)} className="opacity-0 group-hover:opacity-100 p-2 text-gray-200 hover:text-rose-500 transition-all">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar — Insights */}
      <div className="hidden xl:flex flex-col gap-6 w-80 flex-shrink-0">
        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-8">Outflow Breakdown This Month</h3>
          {sortedCategories.length === 0 ? (
            <div className="text-xs text-gray-300 text-center py-12">No expense telemetry</div>
          ) : (
            <div className="flex flex-col gap-6">
              {sortedCategories.map(([cat, amount]) => (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{cat}</span>
                    <span className="text-xs font-black text-gray-800">{AUD(amount)}</span>
                  </div>
                  <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(59,130,246,0.5)]" style={{ width: `${(amount / maxCat) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Spriggy Combined Card */}
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-150 transition-transform duration-1000">
              <div className="text-8xl">💳</div>
           </div>
           <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center font-black text-xl shadow-inner">S</div>
                <div>
                  <div className="text-lg font-black tracking-tight">Spriggy Card</div>
                  <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Unified Kids Portal</div>
                </div>
              </div>
              <div className="mb-8">
                 <div className="text-4xl font-black mb-1 tabular-nums">
                   {AUD(transactions.filter(t => t.is_spriggy && t.type === "income").reduce((s, t) => s + t.amount, 0) - transactions.filter(t => t.is_spriggy && t.type === "expense").reduce((s, t) => s + t.amount, 0))}
                 </div>
                 <div className="text-[10px] font-bold text-white/60 uppercase tracking-[0.2em]">Combined Liquidity</div>
              </div>
              <div className="flex gap-2">
                 <div className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full w-[70%]" />
                 </div>
                 <div className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full w-[40%]" />
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
