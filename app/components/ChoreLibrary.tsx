"use client";
import { useEffect, useState } from "react";
import { Member } from "@/lib/members";

type Template = { id: string; name: string; reward: number };

export default function ChoreLibrary({ members }: { members: Member[] }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", reward: 0 });

  const load = async () => {
    const res = await fetch("/api/chores/templates");
    const data = await res.json();
    setTemplates(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    const name = target.name.value;
    const reward = target.reward.value;
    if (!name) return;

    await fetch("/api/chores/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, reward: parseFloat(reward) || 0 })
    });
    target.reset();
    load();
  };

  const handleUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    await fetch("/api/chores/templates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, ...editForm })
    });
    setEditingId(null);
    load();
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    await fetch(`/api/chores/templates?id=${id}`, { method: "DELETE" });
    load();
  };

  const deploy = async (template: Template, memberId: string) => {
    await fetch("/api/chores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: template.name, assigned_to: memberId, reward: template.reward })
    });
    alert(`Deployed ${template.name} to member.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <h3 className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Chore Library (Template Cache)</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map(t => (
          <div key={t.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col gap-3 group hover:bg-white transition-all relative">
             {editingId === t.id ? (
               <form onSubmit={handleUpdateTemplate} className="space-y-3">
                  <input 
                    value={editForm.name} 
                    onChange={e => setEditForm({...editForm, name: e.target.value})} 
                    className="w-full bg-white border border-purple-200 rounded-lg px-3 py-2 text-xs"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      step="0.5" 
                      value={editForm.reward} 
                      onChange={e => setEditForm({...editForm, reward: parseFloat(e.target.value) || 0})} 
                      className="w-20 bg-white border border-purple-200 rounded-lg px-3 py-2 text-xs"
                    />
                    <button type="submit" className="flex-1 bg-purple-600 text-white rounded-lg text-[10px] font-black uppercase">Save</button>
                    <button type="button" onClick={() => setEditingId(null)} className="px-3 bg-gray-200 text-gray-600 rounded-lg text-[10px] font-black uppercase">X</button>
                  </div>
               </form>
             ) : (
               <>
                 <div className="flex items-center justify-between">
                   <span className="text-xs font-bold text-gray-700">{t.name}</span>
                   <div className="flex items-center gap-2">
                     <span className="text-[10px] font-black text-purple-500">${t.reward.toFixed(2)}</span>
                     <button 
                       onClick={() => { setEditingId(t.id); setEditForm({ name: t.name, reward: t.reward }); }}
                       className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-blue-500 transition-all"
                     >
                       <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                     </button>
                     <button 
                       onClick={() => handleDeleteTemplate(t.id)}
                       className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all"
                     >
                       <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                     </button>
                   </div>
                 </div>
                 <div className="flex flex-wrap gap-1">
                   {members.map(m => (
                     <button 
                       key={m.id} 
                       onClick={() => deploy(t, m.id)}
                       className={`w-6 h-6 rounded-lg ${m.color} text-white flex items-center justify-center text-[8px] font-black hover:scale-110 active:scale-95 transition-all shadow-sm`}
                       title={`Deploy to ${m.name}`}
                     >
                       {m.avatar}
                     </button>
                   ))}
                 </div>
               </>
             )}
          </div>
        ))}
      </div>

      <form onSubmit={handleAddTemplate} className="flex gap-2 p-4 bg-purple-50/30 rounded-xl border border-purple-100 border-dashed">
         <input name="name" placeholder="Save new to library..." className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none" />
         <input name="reward" type="number" step="0.5" placeholder="$" className="w-16 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none" />
         <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-purple-700">Save</button>
      </form>
    </div>
  );
}
