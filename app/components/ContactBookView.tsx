"use client";
import { useEffect, useState, useCallback } from "react";

type Contact = { 
  id: string; 
  name: string; 
  phone: string; 
  email?: string; 
  address?: string; 
  category: string; 
  notes?: string;
  avatar_url?: string;
};

const CATEGORIES = ["Family", "Friends", "Emergency", "School", "Services", "Work"];

export default function ContactBookView() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", category: "Family", notes: "", avatar_url: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contacts");
      const data = await res.json();
      setContacts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load contacts:", err);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to save contact");
      }

      setForm({ name: "", phone: "", email: "", address: "", category: "Family", notes: "", avatar_url: "" });
      setShowAdd(false);
      load();
    } catch (err: any) {
      console.error("Failed to save contact:", err);
      alert(err?.message || "Failed to save contact");
    }
  };

  const uploadAvatarFile = async (file?: File | null) => {
    if (!file) return;
    setAvatarUploading(true);
    try {
      const uploadForm = new FormData();
      uploadForm.append("file", file);

      const res = await fetch("/api/contacts/avatar", {
        method: "POST",
        body: uploadForm,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Avatar upload failed");
      }

      setForm((prev) => ({ ...prev, avatar_url: data.publicUrl || "" }));
    } catch (err: any) {
      console.error("Contact avatar upload failed:", err);
      alert(err?.message || "Avatar upload failed");
    } finally {
      setAvatarUploading(false);
    }
  };

  const startEdit = (contact: Contact) => {
    setForm({
      name: contact.name || "",
      phone: contact.phone || "",
      email: contact.email || "",
      address: contact.address || "",
      category: contact.category || "Family",
      notes: contact.notes || "",
      avatar_url: contact.avatar_url || "",
    });
    setIsEditing(true);
    setShowAdd(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact || !form.name.trim() || !form.phone.trim()) return;
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", id: selectedContact.id, ...form }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to update contact");
      }

      const updated = await res.json();
      setSelectedContact(updated);
      setIsEditing(false);
      await load();
    } catch (err: any) {
      console.error("Failed to update contact:", err);
      alert(err?.message || "Failed to update contact");
    }
  };

  const filtered = contacts.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  return (
    <div className="flex gap-0 h-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Sidebar List */}
      <div className="w-80 border-r border-gray-100 flex flex-col bg-gray-50/50">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-2xl">📖</span>
            <h2 className="text-xl font-black text-gray-800">Contact Book</h2>
          </div>
          <div className="relative mb-4">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..." className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {loading ? (
             <div className="space-y-3 animate-pulse">
               {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl" />)}
             </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 opacity-30">
               <div className="text-xs font-black uppercase tracking-widest text-gray-400">No contact</div>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map(c => (
                <button 
                  key={c.id} 
                  onClick={() => { setSelectedContact(c); setShowAdd(false); setIsEditing(false); }}
                  className={`w-full p-3 rounded-xl text-left transition-all group flex items-center gap-3 border ${
                    selectedContact?.id === c.id 
                      ? "bg-blue-600 border-blue-600 text-white shadow-lg" 
                      : "hover:bg-white border-transparent hover:border-gray-100 text-gray-800"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 ${selectedContact?.id === c.id ? 'bg-white/20' : 'bg-gray-200'}`}>
                    {c.avatar_url ? (
                      <img src={c.avatar_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-[10px] text-gray-400">
                        {c.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="font-bold text-sm truncate">{c.name}</div>
                    <div className={`text-[10px] truncate ${selectedContact?.id === c.id ? 'text-blue-100' : 'text-gray-400'}`}>{c.phone}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100">
           <button onClick={() => { setShowAdd(true); setSelectedContact(null); setIsEditing(false); setForm({ name: "", phone: "", email: "", address: "", category: "Family", notes: "", avatar_url: "" }); }} className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95">Add a contact</button>
        </div>
      </div>

      {/* Main Detail / Form Area */}
      <div className="flex-1 flex flex-col bg-white overflow-y-auto">
        {showAdd || isEditing ? (
          <div className="p-12">
            <div className="max-w-xl mx-auto bg-white rounded-3xl border border-gray-100 p-10 shadow-xl">
               <h3 className="text-xl font-black text-gray-800 mb-8 uppercase tracking-widest text-center">{isEditing ? "Edit Household Contact" : "New Household Contact"}</h3>
               <form onSubmit={isEditing ? handleUpdate : handleAdd} className="space-y-6">
                  <div className="flex items-center justify-center mb-8">
                     <div className="w-24 h-24 bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-gray-300 relative group overflow-hidden">
                        {form.avatar_url ? (
                          <img src={form.avatar_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v8M8 12h8"></path></svg>
                            <span className="text-[8px] font-black uppercase mt-1">Upload Photo</span>
                          </>
                        )}
                        <label className="absolute inset-0 cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => uploadAvatarFile(e.target.files?.[0])}
                            disabled={avatarUploading}
                          />
                        </label>
                     </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Full Name</label>
                      <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm" placeholder="e.g. Grandma" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone</label>
                        <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm" placeholder="0400 000 000" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</label>
                        <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm">
                          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Avatar URL (Optional)</label>
                      <input type="url" value={form.avatar_url} onChange={e => setForm({...form, avatar_url: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm" placeholder="https://..." />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Notes</label>
                      <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm resize-none" rows={2} />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20">{isEditing ? "Update Contact" : "Save Contact"}</button>
                    <button type="button" onClick={() => { setShowAdd(false); setIsEditing(false); }} className="px-8 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest">Cancel</button>
                  </div>
                  {avatarUploading && (
                    <div className="text-center text-[10px] font-black uppercase tracking-widest text-blue-500">
                      Uploading avatar...
                    </div>
                  )}
               </form>
            </div>
          </div>
        ) : selectedContact ? (
          <div className="p-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="max-w-2xl mx-auto flex flex-col items-center text-center">
                <div className="w-32 h-32 rounded-[2.5rem] bg-gray-50 border border-gray-100 shadow-xl overflow-hidden mb-8 relative group">
                   {selectedContact.avatar_url ? (
                     <img src={selectedContact.avatar_url} className="w-full h-full object-cover" alt={selectedContact.name} />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-4xl font-black text-gray-200">
                        {selectedContact.name.charAt(0)}
                     </div>
                   )}
                   <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button onClick={() => startEdit(selectedContact)} className="bg-white/90 backdrop-blur-sm text-gray-800 px-4 py-2 rounded-full text-[10px] font-black uppercase">Edit</button>
                   </div>
                </div>

                <div className="mb-12">
                   <h2 className="text-4xl font-black text-gray-800 mb-2">{selectedContact.name}</h2>
                   <div className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest inline-block">
                      {selectedContact.category}
                   </div>
                </div>

                <div className="w-full grid grid-cols-1 gap-6 text-left">
                   <div className="bg-gray-50/50 rounded-3xl p-8 border border-gray-100 flex flex-col items-center">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Relational Node Address</div>
                      <div className="text-5xl font-black text-gray-800 tracking-tight tabular-nums break-all mb-2">
                         {selectedContact.phone}
                      </div>
                      <div className="flex gap-4 mt-6">
                        <a 
                          href={`tel:${selectedContact.phone.replace(/\s+/g, '')}`}
                          className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 active:scale-90 transition-all cursor-pointer hover:bg-emerald-600"
                        >
                           <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20 15.5c-1.2 0-2.4-.2-3.6-.6-.3-.1-.7 0-1 .2l-2.2 2.2c-2.8-1.4-5.1-3.8-6.6-6.6l2.2-2.2c.3-.3.4-.7.2-1-.3-1.1-.5-2.3-.5-3.5 0-.6-.4-1-1-1H4c-.6 0-1 .4-1 1 0 9.4 7.6 17 17 17 .6 0 1-.4 1-1v-3.5c0-.6-.4-1-1-1z"/></svg>
                        </a>
                        <a 
                          href={`sms:${selectedContact.phone.replace(/\s+/g, '')}`}
                          className="w-14 h-14 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20 active:scale-90 transition-all cursor-pointer hover:bg-blue-600"
                        >
                           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        </a>
                      </div>
                   </div>

                   {(selectedContact.email || selectedContact.address || selectedContact.notes) && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {selectedContact.email && (
                          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                             <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Digital Sync</div>
                             <div className="text-sm font-bold text-gray-700">{selectedContact.email}</div>
                          </div>
                        )}
                        {selectedContact.address && (
                          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                             <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Physical Location</div>
                             <div className="text-sm font-bold text-gray-700">{selectedContact.address}</div>
                          </div>
                        )}
                        {selectedContact.notes && (
                          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm md:col-span-2">
                             <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Observation Log</div>
                             <div className="text-sm font-medium text-gray-500 leading-relaxed whitespace-pre-wrap">{selectedContact.notes}</div>
                          </div>
                        )}
                     </div>
                   )}
                </div>
             </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="relative w-32 h-32 mb-8">
               <div className="absolute inset-0 bg-blue-50 rounded-full animate-ping opacity-20"></div>
               <div className="relative bg-white rounded-2xl border border-gray-100 shadow-xl w-full h-full flex flex-col items-center justify-center p-4">
                  <div className="text-4xl mb-2">📖</div>
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xl">+</div>
               </div>
            </div>
            <h3 className="text-2xl font-black text-gray-800 mb-4">No contact selected</h3>
            <p className="text-xs font-bold text-gray-400 leading-relaxed mb-8">Select a contact from the sidebar or add a new family connection.</p>
            <button onClick={() => setShowAdd(true)} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95">Add a contact</button>
          </div>
        )}
      </div>
    </div>
  );
}
