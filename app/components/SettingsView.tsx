"use client";

import { useEffect, useState } from "react";
import { Member } from "@/lib/members";
import ChoreLibrary from "./ChoreLibrary";
import { createClient } from "@/lib/supabase/client";

export default function SettingsView({ onMembersChange }: { onMembersChange: () => void }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [authLoading, setAuthLoading] = useState<string | null>(null);
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
  const [tokenStatus, setTokenStatus] = useState<Record<string, boolean>>({});
  const [adminUser, setAdminUser] = useState<any>(null);
  const [openingBalances, setOpeningBalances] = useState<Record<string, string>>({});
  const [bills, setBills] = useState<any[]>([]);
  const [billLedgerTotal, setBillLedgerTotal] = useState(0);
  const [billResetDate, setBillResetDate] = useState("");
  const [billForm, setBillForm] = useState({ name: "", amount: "", dueDate: new Date().toISOString().split("T")[0] });
  
  const supabase = createClient();

  // Form State
  const [name, setName] = useState("");
  const [role, setRole] = useState<"ADMIN" | "TEEN" | "CHILD">("CHILD");
  const [color, setColor] = useState("bg-blue-500");

  const colors = [
    "bg-pink-500", "bg-blue-500", "bg-purple-500", "bg-emerald-500", 
    "bg-orange-500", "bg-indigo-500", "bg-rose-500", "bg-cyan-500"
  ];

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/members");
      const data = await res.json();
      setMembers(data);
    } catch (err) {
      console.error("Failed to load members:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadFinanceAdmin = async () => {
    try {
      const [metaRes, billsRes] = await Promise.all([
        fetch("/api/rewards-meta"),
        fetch("/api/bills"),
      ]);
      const meta = await metaRes.json();
      const billsData = await billsRes.json();
      setOpeningBalances(
        Object.fromEntries(
          Object.entries(meta?.openingBalances || {}).map(([key, value]) => [key, String(value)])
        )
      );
      setBills(billsData?.allBills || []);
      setBillLedgerTotal(Number(billsData?.totalExpenditureToDate || 0));
      setBillResetDate(billsData?.resetDate || "");
    } catch (err) {
      console.error("Finance admin load failed:", err);
    }
  };

  const loadIdentities = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setAdminUser(user);
    }
    if (user?.identities) {
      setConnectedProviders(user.identities.map(i => i.provider));
    }

    // Check token status in DB
    const { data: settings } = await supabase.from('household_settings').select('key');
    if (settings) {
      const keys = settings.map(s => s.key);
      setTokenStatus({
        google: keys.includes('google_refresh_token'),
        spotify: keys.includes('spotify_refresh_token')
      });
    }
  };

  useEffect(() => {
    refresh();
    loadIdentities();
    loadFinanceAdmin();
  }, []);

  const saveOpeningBalances = async () => {
    const normalized = Object.fromEntries(
      Object.entries(openingBalances).map(([key, value]) => [key, Number(value || 0)])
    );
    await fetch("/api/rewards-meta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_opening_balances", openingBalances: normalized }),
    });
    await loadFinanceAdmin();
  };

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billForm.name.trim() || !billForm.amount) return;
    await fetch("/api/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", ...billForm, amount: Number(billForm.amount) }),
    });
    setBillForm({ name: "", amount: "", dueDate: new Date().toISOString().split("T")[0] });
    await loadFinanceAdmin();
  };

  const toggleBillPaid = async (id: string) => {
    await fetch("/api/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_paid", id }),
    });
    await loadFinanceAdmin();
  };

  const clearPaidBills = async () => {
    const month = new Date().toISOString().slice(0, 7);
    await fetch("/api/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear_paid", month }),
    });
    await loadFinanceAdmin();
  };

  const resetBillsLedger = async () => {
    await fetch("/api/rewards-meta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset_bills_ledger" }),
    });
    await loadFinanceAdmin();
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role, color }),
      });

      if (!res.ok) throw new Error("Failed to add member");

      setName("");
      await refresh();
      onMembersChange();
    } catch (err) {
      alert("Error adding member");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm("Are you sure you want to remove this family member? All their associated chores and reward history will remain but the node will be deactivated.")) return;
    try {
      const res = await fetch("/api/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      await refresh();
      onMembersChange();
    } catch (err) {
      alert("Error removing member");
    }
  };

  const handleLink = async (provider: 'spotify' | 'google') => {
    setAuthLoading(provider);
    try {
      const origin = window.location.origin.replace('0.0.0.0', 'localhost');
      const scopes = provider === 'spotify' 
        ? 'user-read-email user-read-currently-playing user-read-playback-state'
        : 'openid email profile https://www.googleapis.com/auth/photoslibrary.readonly https://www.googleapis.com/auth/calendar.readonly';

      // FORCE CLEAR: If there is a corrupted/stale session in LocalStorage, 
      // Supabase will send an invalid Auth header and throw "missing sub claim".
      await supabase.auth.signOut();

      // Force account selection dialogs so it doesn't instantly auto-login the wrong cached account
      const queryParams: any = {
        access_type: 'offline',
      };
      
      if (provider === 'spotify') {
        queryParams.show_dialog = 'true';
      } else if (provider === 'google') {
        queryParams.prompt = 'consent select_account';
      }

      const { data, error } = await supabase.auth.signInWithOAuth({ 
        provider,
        options: {
          redirectTo: `${origin}/auth/callback?provider=${provider}&next=${encodeURIComponent('/?view=settings')}`,
          scopes,
          queryParams
        }
      });

      if (error) throw error;
    } catch (err: any) {
      console.error(`Auth link error (${provider}):`, err);
      alert(`Connection failed: ${err.message}`);
    } finally {
      setAuthLoading(null);
    }
  };

  const handleDisconnect = async (provider: 'spotify' | 'google') => {
    try {
      const res = await fetch("/api/settings/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider })
      });
      if (res.ok) {
        setTokenStatus(prev => ({ ...prev, [provider]: false }));
        setConnectedProviders(prev => prev.filter(p => p !== provider));
      }
    } catch (err) {
      console.error("Disconnect error:", err);
    }
  };

  const handleSupabaseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = (e.target as any).email.value;
    const password = (e.target as any).password.value;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setAdminUser(data.user);
    } catch (err: any) {
      alert(`Login failed: ${err.message}`);
    }
  };

  if (loading) return (
    <div className="p-12 text-center animate-pulse">
      <div className="text-4xl mb-4">⚙️</div>
      <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Loading Registry...</div>
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      
      {/* Core Database Auth */}
      <section className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-8">Supabase Login</h2>
        
        {adminUser ? (
          <div className="flex items-center justify-between p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center text-xl shadow-lg shadow-emerald-500/20">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
              <div>
                <div className="font-bold text-emerald-900 text-sm">Database Admin Connected</div>
                <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{adminUser.email}</div>
              </div>
            </div>
            <button 
              onClick={async () => { await supabase.auth.signOut(); setAdminUser(null); }}
              className="px-6 py-2 bg-white text-emerald-700 border border-emerald-200 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-100 transition-all active:scale-95 shadow-sm"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <form onSubmit={handleSupabaseLogin} className="flex items-center gap-4 p-6 bg-gray-50 rounded-2xl border border-gray-100">
             <div className="w-12 h-12 bg-gray-900 text-white rounded-xl flex items-center justify-center text-xl shadow-lg">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
             </div>
             <div className="flex-1 flex gap-4">
               <input type="email" name="email" placeholder="Admin Email" required className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
               <input type="password" name="password" placeholder="Password" required className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
             </div>
             <button type="submit" className="px-8 py-3 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-lg">
               Admin Login
             </button>
          </form>
        )}
      </section>

      {/* Integrations */}
      <section className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-8">Third-Party Integrations</h2>
          <div className="flex flex-col gap-3">
            
            {/* Spotify */}
            <div className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#1DB954] text-white rounded-xl flex items-center justify-center text-2xl">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.494 17.306c-.215.353-.679.467-1.032.252-2.855-1.744-6.45-2.138-10.684-1.17-.404.092-.808-.162-.9-.566-.092-.403.161-.808.566-.9 4.636-1.06 8.598-.606 11.798 1.348.353.215.467.679.252 1.036zm1.466-3.26c-.271.442-.847.584-1.288.314-3.266-2.008-8.246-2.593-12.11-1.419-.497.151-1.02-.132-1.171-.629-.151-.497.132-1.02.629-1.171 4.417-1.341 9.902-.686 13.636 1.606.442.271.584.847.314 1.288zm.13-3.419c-3.917-2.326-10.37-2.541-14.13-1.4c-.6.181-1.237-.162-1.419-.763-.181-.601.162-1.237.763-1.419 4.316-1.31 11.434-1.049 15.952 1.631.54.32.716 1.015.396 1.554-.32.539-1.015.715-1.554.396z"/>
                  </svg>
                </div>
                <div>
                  <div className="font-bold text-gray-800 text-sm">Spotify</div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Connect household audio identity</div>
                </div>
              </div>
              <div className="flex gap-2">
                {tokenStatus.spotify && (
                  <button onClick={() => handleDisconnect('spotify')} className="px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 active:scale-95">
                    Disconnect
                  </button>
                )}
                <button 
                  onClick={() => handleLink('spotify')}
                  disabled={!!authLoading}
                  className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-80 ${
                    tokenStatus.spotify 
                      ? 'bg-emerald-500 text-white shadow-emerald-500/20 hover:bg-emerald-600' 
                      : 'bg-[#1DB954] text-white shadow-[#1DB954]/20 hover:bg-[#1ed760]'
                  }`}
                >
                  {authLoading === 'spotify' ? 'Connecting...' : tokenStatus.spotify ? '🔄 Switch Account' : 'Connect'}
                </button>
              </div>
            </div>

            {/* Google Workspace */}
            <div className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100 mt-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white border border-gray-100 text-white rounded-xl flex items-center justify-center text-2xl shadow-sm">
                   <svg width="24" height="24" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                </div>
                <div>
                  <div className="font-bold text-gray-800 text-sm">Google Workspace (Photos & Calendar)</div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Connect visual and scheduling modules</div>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                {tokenStatus.google && (
                  <button onClick={() => handleDisconnect('google')} className="px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 active:scale-95">
                    Disconnect
                  </button>
                )}
                <button 
                  onClick={() => handleLink('google')}
                  disabled={!!authLoading}
                  className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm active:scale-95 disabled:opacity-80 ${
                    tokenStatus.google
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {authLoading === 'google' ? 'Connecting...' : tokenStatus.google ? '🔄 Switch Account' : 'Connect'}
                </button>
              </div>
            </div>
          </div>
      </section>

      {/* Add Member Form */}
      <section className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-8">Rewards & Bills Control</h2>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4">Starting Balances</h3>
              <div className="space-y-3">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${member.color} text-white flex items-center justify-center text-[10px] font-black`}>{member.avatar}</div>
                    <div className="flex-1 text-sm font-bold text-gray-800">{member.name}</div>
                    <input
                      type="number"
                      step="0.01"
                      value={openingBalances[member.id] || ""}
                      onChange={(e) => setOpeningBalances((prev) => ({ ...prev, [member.id]: e.target.value }))}
                      className="w-32 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm"
                    />
                  </div>
                ))}
              </div>
              <button onClick={saveOpeningBalances} className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all">
                Save Starting Balances
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-4">Bills To Pay</h3>
              <form onSubmit={handleCreateBill} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input value={billForm.name} onChange={(e) => setBillForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Bill name" className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm" />
                <input type="number" step="0.01" value={billForm.amount} onChange={(e) => setBillForm((prev) => ({ ...prev, amount: e.target.value }))} placeholder="Invoice amount" className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm" />
                <input type="date" value={billForm.dueDate} onChange={(e) => setBillForm((prev) => ({ ...prev, dueDate: e.target.value }))} className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm" />
                <button type="submit" className="md:col-span-3 px-6 py-3 bg-rose-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 transition-all">
                  Add Bill
                </button>
              </form>
            </div>

            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bills Ledger</div>
                  <div className="text-lg font-black text-gray-800">${billLedgerTotal.toFixed(2)}</div>
                  <div className="text-[10px] text-gray-400">Tracked since {billResetDate || "today"}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={clearPaidBills} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all">Clear Paid This Month</button>
                  <button onClick={resetBillsLedger} className="px-4 py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">Reset Yearly Total</button>
                </div>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {bills.map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3">
                    <div>
                      <div className="text-sm font-bold text-gray-800">{bill.name}</div>
                      <div className="text-[10px] text-gray-400">Due {bill.dueDate} · ${Number(bill.amount).toFixed(2)}</div>
                    </div>
                    <button
                      onClick={() => toggleBillPaid(bill.id)}
                      className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${bill.status === "outstanding" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                    >
                      {bill.status}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Add Member Form */}
      <section className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-8">Add Household Member</h2>
        <form onSubmit={handleAddMember} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dale"
                className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</label>
              <select 
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="ADMIN">Admin (Parent)</option>
                <option value="TEEN">Teenager</option>
                <option value="CHILD">Child</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Theme Color</label>
            <div className="flex flex-wrap gap-3">
              {colors.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-10 h-10 rounded-full ${c} transition-all ${color === c ? 'ring-4 ring-offset-2 ring-blue-500 scale-110' : 'opacity-60 hover:opacity-100'}`}
                />
              ))}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={!name.trim() || isSaving}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/25"
          >
            {isSaving ? "Registering..." : "Add to Registry"}
          </button>
        </form>
      </section>

      {/* Active Members List */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50/50 border-b border-gray-100">
          <h3 className="font-black text-gray-400 text-[10px] tracking-[0.3em] uppercase text-center">Active Relational Nodes</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {members.map(member => (
            <div key={member.id} className="p-5 flex items-center justify-between group hover:bg-gray-50 transition-all">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full ${member.color} text-white flex items-center justify-center font-bold text-sm shadow-inner`}>
                  {member.avatar}
                </div>
                <div>
                  <div className="font-bold text-gray-800 text-sm">{member.name}</div>
                  <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{member.role}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="text-[10px] font-black text-gray-300 uppercase hover:text-blue-500 transition-colors">Edit</button>
                <span className="text-gray-100">|</span>
                <button onClick={() => handleDeleteMember(member.id)} className="text-[10px] font-black text-gray-300 uppercase hover:text-red-500 transition-colors">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Security Settings */}
      <section className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-8">Security & Access</h2>
        <div className="flex flex-col gap-6">
          <form className="flex items-end gap-4" onSubmit={async (e) => {
            e.preventDefault();
            const target = e.target as any;
            const newPin = target.new_pin.value;
            if (newPin.length !== 4) return alert("PIN must be 4 digits");
            
            const res = await fetch("/api/settings/pin", { 
              method: "POST", 
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ newPin }) 
            });
            if (res.ok) {
              target.reset();
              alert("Admin PIN updated successfully");
            } else {
              alert("Failed to update PIN");
            }
          }}>
            <div className="flex-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Change Admin PIN</label>
              <input 
                name="new_pin" 
                type="password" 
                maxLength={4} 
                pattern="\d{4}" 
                placeholder="Enter 4 digits"
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" 
              />
            </div>
            <button type="submit" className="px-8 py-3 bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all">Update PIN</button>
          </form>
          <p className="text-[10px] font-bold text-gray-400 leading-tight">
            Changing the PIN will immediately lock all administrative functions. Ensure all members are aware of the new access code.
          </p>
        </div>
      </section>

      {/* Chore & Reward Management */}
      <section className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-8">Chore & Reward Management</h2>
        <div className="flex flex-col gap-8">
           {/* Direct Add */}
           <div className="space-y-4">
             <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Deploy One-off Chore</h3>
             <form className="grid grid-cols-1 md:grid-cols-4 gap-4" onSubmit={async (e) => {
               e.preventDefault();
               const target = e.target as any;
               const name = target.chore_name.value;
               const assigned_to = target.assigned_to.value;
               const reward = target.reward.value;
               if (!name || !assigned_to) return;
               
               await fetch("/api/chores", { 
                 method: "POST", 
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify({ name, assigned_to, reward: parseFloat(reward) || 0 }) 
               });
               target.reset();
               alert("Chore deployed to matrix");
             }}>
                <div className="md:col-span-1">
                  <input name="chore_name" placeholder="Chore Name" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs" />
                </div>
                <div>
                  <select name="assigned_to" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs">
                    <option value="">Assign To...</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <input name="reward" type="number" step="0.5" placeholder="Reward ($)" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs" />
                </div>
                <button type="submit" className="bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all">Deploy</button>
             </form>
           </div>

           <div className="w-full h-px bg-gray-100" />

           {/* Chore Library */}
           <ChoreLibrary members={members} />

           <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center font-black text-xs">S</div>
              <div className="text-[10px] font-bold text-blue-800 leading-tight">
                Spriggy sync is active. Completed chores will automatically trigger credit transfers to member budget ledgers.
              </div>
           </div>
        </div>
      </section>

      {/* Routine Management */}
      <section className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-8">Routine Management</h2>
        <div className="flex flex-col gap-8">
           <div className="space-y-4">
             <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Add Daily Routine</h3>
             <form className="grid grid-cols-1 md:grid-cols-3 gap-4" onSubmit={async (e) => {
               e.preventDefault();
               const target = e.target as any;
               const name = target.routine_name.value;
               const assigned_to = target.assigned_to.value;
               if (!name || !assigned_to) return;
               
               await fetch("/api/routines", { 
                 method: "POST", 
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify({ name, assigned_to }) 
               });
               target.reset();
               alert("Routine added to matrix");
             }}>
                <div className="md:col-span-1">
                  <input name="routine_name" placeholder="Routine Name (e.g. Brush Teeth)" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs" />
                </div>
                <div>
                  <select name="assigned_to" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs">
                    <option value="">Assign To...</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <button type="submit" className="bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all">Add Routine</button>
             </form>
           </div>
        </div>
      </section>

    </div>
  );
}
