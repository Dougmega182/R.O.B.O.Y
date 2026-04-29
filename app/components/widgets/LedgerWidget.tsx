"use client";

import { useWidgetData } from "@/lib/hooks/useWidgetData";
import { LedgerResponse, isLedgerResponse } from "@/lib/contracts/ledger";
import { ledgerStore } from "@/lib/stores/ledgerStore";

export default function LedgerWidget() {
  const { data, loading, error, refresh } = useWidgetData<LedgerResponse>(
    "/api/ledger?accountId=u1",
    isLedgerResponse,
    ledgerStore,
    15000
  );

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 h-full flex flex-col shadow-2xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white tracking-tight">Family Bank</h2>
        <div className="text-[10px] text-slate-500 font-mono">u1: 13yo Boy</div>
      </div>

      <div className="flex-1 flex flex-col gap-6">
        {/* Balance Display */}
        <div className="bg-slate-950/50 rounded-2xl p-6 border border-slate-800 flex flex-col items-center justify-center text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2 font-bold">Total Savings</span>
          <span className="text-5xl font-black text-emerald-400 tracking-tighter tabular-nums">
            ${((data?.balance_cents || 0) / 100).toFixed(2)}
          </span>
          <div className="mt-2 flex items-center gap-1.5 text-slate-600 text-[10px] uppercase font-bold">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
            Verified & Cleared
          </div>
        </div>

        {/* Transaction History */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <h3 className="text-[10px] uppercase tracking-widest text-slate-500 mb-3 font-bold">Recent Activity</h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {loading && !data && [1,2,3].map(i => <div key={i} className="h-10 bg-slate-800/30 rounded-lg animate-pulse" />)}
            {data?.transactions.map((t) => (
              <div key={t.id} className="flex justify-between items-center p-3 bg-slate-800/30 rounded-xl border border-slate-800/50 hover:bg-slate-800 transition-all">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-200 font-medium">{t.reason}</span>
                  <span className="text-[9px] text-slate-600 font-mono">{new Date(t.created_at).toLocaleDateString()}</span>
                </div>
                <span className={`text-xs font-bold font-mono ${t.amount_cents >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {t.amount_cents >= 0 ? '+' : ''}${(t.amount_cents / 100).toFixed(2)}
                </span>
              </div>
            ))}
            {data?.transactions.length === 0 && (
              <div className="h-24 flex items-center justify-center text-slate-700 italic text-xs">
                No transactions recorded.
              </div>
            )}
          </div>
        </div>
      </div>
      
      <button 
        onClick={refresh}
        className="mt-6 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all"
      >
        Refresh Ledger
      </button>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.05);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}

