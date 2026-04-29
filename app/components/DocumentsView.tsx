"use client";

import { useEffect, useState, useCallback } from "react";

type Doc = {
  id: string;
  name: string;
  category: string;
  url: string;
  uploaded_by?: string;
  created_at: string;
  household_members?: { name: string; avatar: string; color: string };
};

const CATEGORIES = ["General", "School", "Insurance", "Medical", "Financial", "Receipts", "Legal", "Other"];
const CAT_ICONS: Record<string, string> = {
  General: "📄",
  School: "🎓",
  Insurance: "🛡",
  Medical: "🏥",
  Financial: "💳",
  Receipts: "🧾",
  Legal: "⚖",
  Other: "📎",
};

const INBOUND_EMAIL = process.env.NEXT_PUBLIC_DOCUMENTS_INBOUND_EMAIL || "";

export default function DocumentsView() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", category: "General", file_url: "" });
  const [editForm, setEditForm] = useState({ id: "", name: "", category: "General" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      setDocs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load documents:", err);
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const uploadForm = new FormData();
      uploadForm.append("file", file);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: uploadForm,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setForm((prev) => ({
        ...prev,
        file_url: data.publicUrl as string,
        name: prev.name || file.name,
      }));
    } catch (err: any) {
      console.error("Upload error:", err);
      alert(`Upload failed: ${err.message || "Unknown error"}`);
    } finally {
      setUploading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.file_url.trim()) return;

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save document");
      }

      setForm({ name: "", category: "General", file_url: "" });
      setShowAdd(false);
      load();
    } catch (err: any) {
      console.error("Failed to save document:", err);
      alert(err.message || "Failed to save document");
    }
  };

  const handleStartEdit = (doc: Doc) => {
    setEditingDocId(doc.id);
    setEditForm({
      id: doc.id,
      name: doc.name,
      category: doc.category || "General",
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.id || !editForm.name.trim()) return;

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          id: editForm.id,
          name: editForm.name,
          category: editForm.category,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update document");
      }

      setEditingDocId(null);
      load();
    } catch (err: any) {
      console.error("Failed to update document:", err);
      alert(err.message || "Failed to update document");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    load();
  };

  const filtered = docs.filter((doc) => {
    if (filter !== "All" && doc.category !== filter) return false;
    if (search && !doc.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const categoryCounts = docs.reduce((acc, doc) => {
    acc[doc.category] = (acc[doc.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex gap-0 h-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="w-56 border-r border-gray-100 flex flex-col bg-gray-50/50">
        <div className="p-5">
          <h2 className="text-lg font-black text-gray-800">Documents</h2>
          <p className="text-[10px] font-medium text-gray-400">{docs.length} files</p>
        </div>

        {INBOUND_EMAIL && (
          <div className="mx-3 mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-amber-700">Email Documents</div>
            <div className="mt-1 text-xs font-semibold text-amber-900 break-all">{INBOUND_EMAIL}</div>
            <div className="mt-1 text-[10px] text-amber-700">Attachments sent here will appear in this panel.</div>
          </div>
        )}

        <div className="px-3 mb-3">
          <div className="relative">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          <button onClick={() => setFilter("All")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left mb-0.5 transition-all ${filter === "All" ? "bg-blue-50 text-blue-700" : "hover:bg-gray-100 text-gray-700"}`}>
            <span>🗂</span>
            <span className="text-sm font-semibold flex-1">All Documents</span>
            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{docs.length}</span>
          </button>
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setFilter(category)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left mb-0.5 transition-all ${filter === category ? "bg-blue-50 text-blue-700" : "hover:bg-gray-100 text-gray-700"}`}
            >
              <span>{CAT_ICONS[category]}</span>
              <span className="text-sm font-semibold flex-1">{category}</span>
              {categoryCounts[category] ? (
                <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{categoryCounts[category]}</span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="p-3">
          <button onClick={() => setShowAdd(true)} className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Upload
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {showAdd && (
          <form onSubmit={handleAdd} className="p-5 border-b border-gray-100 bg-blue-50/30">
            <div className="flex flex-col gap-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Document name"
                  className="flex-1 text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  autoFocus
                />
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-2">
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 items-center">
                <div className="flex-1 relative">
                  <input
                    type="url"
                    value={form.file_url}
                    onChange={(e) => setForm({ ...form, file_url: e.target.value })}
                    placeholder="File URL or Google Drive link"
                    className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {uploading ? (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-blue-500 animate-pulse">Uploading...</div>
                  ) : null}
                </div>
                <label className="cursor-pointer px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-50 transition-all flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  {form.file_url ? "Change File" : "Upload Local"}
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </label>
                <button type="submit" disabled={uploading || !form.file_url} className="px-6 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  Save to Vault
                </button>
                <button type="button" onClick={() => setShowAdd(false)} className="p-2 text-gray-400 hover:text-gray-600">
                  ×
                </button>
              </div>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center animate-pulse">
            <div className="text-xs text-gray-300">Loading documents...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <div className="text-4xl mb-4 opacity-20">📄</div>
              <div className="text-sm font-bold text-gray-400 mb-2">No documents found</div>
              <div className="text-xs text-gray-300">Upload or email your family&apos;s important documents</div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-5">
              {filtered.map((doc) => {
                const isEditing = editingDocId === doc.id;
                return (
                  <div key={doc.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-200 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-lg">
                        {CAT_ICONS[doc.category] || "📄"}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleStartEdit(doc)} className="text-gray-300 hover:text-blue-600 transition-all">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(doc.id)} className="text-gray-300 hover:text-red-500 transition-all">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                    </div>

                    {isEditing ? (
                      <form onSubmit={handleSaveEdit} className="space-y-3">
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full text-sm font-bold text-gray-800 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          autoFocus
                        />
                        <select
                          value={editForm.category}
                          onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                          className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2"
                        >
                          {CATEGORIES.map((category) => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <button type="submit" className="px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700">
                            Save
                          </button>
                          <button type="button" onClick={() => setEditingDocId(null)} className="px-3 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200">
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-gray-800 hover:text-blue-600 transition-colors block truncate mb-1">
                          {doc.name}
                        </a>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                          <span className="bg-gray-100 px-2 py-0.5 rounded font-semibold">{doc.category}</span>
                          <span>{new Date(doc.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
