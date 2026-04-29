"use client";

import { useEffect, useState, useCallback } from "react";

type List = {
  id: string;
  name: string;
  icon: string;
  color: string;
  show_in_activity?: boolean;
  list_items?: { count: number }[];
};

type ListItem = {
  id: string;
  list_id: string;
  content: string;
  completed: boolean;
  created_at: string;
};

const LIST_ICONS = ["📋", "🛒", "🏪", "✅", "🎁", "🏠", "📦", "🎯", "📝", "🍕"];
const LIST_COLORS = ["#4285f4", "#ea4335", "#34a853", "#fbbc05", "#ff6d01", "#46bdc6", "#7b1fa2", "#e91e63"];

export default function ListView() {
  const [lists, setLists] = useState<List[]>([]);
  const [activeList, setActiveList] = useState<string | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [newItemText, setNewItemText] = useState("");
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListIcon, setNewListIcon] = useState("📋");
  const [newListColor, setNewListColor] = useState("#4285f4");
  const [editingList, setEditingList] = useState(false);
  const [editListName, setEditListName] = useState("");
  const [editListIcon, setEditListIcon] = useState("📋");
  const [editListColor, setEditListColor] = useState("#4285f4");

  const loadLists = useCallback(async () => {
    try {
      const res = await fetch("/api/lists");
      const data = await res.json();
      const safeLists = Array.isArray(data) ? data : [];
      setLists(safeLists);

      if (safeLists.length === 0) {
        setActiveList(null);
        setEditingList(false);
        return;
      }

      if (!activeList || !safeLists.some((list) => list.id === activeList)) {
        setActiveList(safeLists[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeList]);

  const loadItems = useCallback(async (listId: string) => {
    setItemsLoading(true);
    try {
      const res = await fetch(`/api/lists/${listId}/items`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setItemsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  useEffect(() => {
    if (activeList) {
      loadItems(activeList);
    } else {
      setItems([]);
    }
  }, [activeList, loadItems]);

  const activeListData = lists.find((list) => list.id === activeList);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim() || !activeList) return;

    const tempId = Math.random().toString(36).substring(7);
    const content = newItemText;
    setNewItemText("");

    // Optimistic Add
    setItems(prev => [{
      id: tempId,
      list_id: activeList,
      content,
      completed: false,
      created_at: new Date().toISOString()
    }, ...prev]);

    try {
      const res = await fetch(`/api/lists/${activeList}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      });
      if (!res.ok) throw new Error("Add failed");
      
      // Refresh to get real ID
      loadItems(activeList);
      loadLists();
    } catch (err) {
      console.error(err);
      loadItems(activeList);
    }
  };

  const handleToggle = async (itemId: string, completed: boolean) => {
    if (!activeList) return;

    // Optimistic Toggle
    setItems(prev => prev.map(item => item.id === itemId ? { ...item, completed: !completed } : item));

    try {
      const res = await fetch(`/api/lists/${activeList}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", itemId, completed: !completed }),
      });
      if (!res.ok) throw new Error("Toggle failed");
      
      // Minor sync check
      loadLists();
    } catch (err) {
      console.error(err);
      loadItems(activeList);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!activeList) return;

    await fetch(`/api/lists/${activeList}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", itemId }),
    });

    loadItems(activeList);
    loadLists();
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newListName, icon: newListIcon, color: newListColor }),
    });

    setNewListName("");
    setNewListIcon("📋");
    setNewListColor("#4285f4");
    setShowNewList(false);
    loadLists();
  };

  const handleDeleteList = async (listId: string) => {
    if (!confirm("Delete this list and all its items?")) return;

    await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id: listId }),
    });

    if (activeList === listId) {
      setActiveList(null);
      setEditingList(false);
    }

    loadLists();
  };

  const handleToggleActivity = async () => {
    if (!activeListData) return;

    await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "toggle_activity",
        id: activeListData.id,
        showInActivity: !activeListData.show_in_activity,
      }),
    });

    loadLists();
  };

  const handleStartEditList = () => {
    if (!activeListData) return;
    setEditListName(activeListData.name);
    setEditListIcon(activeListData.icon);
    setEditListColor(activeListData.color);
    setEditingList(true);
  };

  const handleSaveList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeListData || !editListName.trim()) return;

    await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        id: activeListData.id,
        name: editListName,
        icon: editListIcon,
        color: editListColor,
      }),
    });

    setEditingList(false);
    loadLists();
  };

  const getItemCount = (list: List) => {
    if (list.list_items && list.list_items.length > 0) return list.list_items[0].count;
    return 0;
  };

  const pendingItems = items.filter((item) => !item.completed);
  const completedItems = items.filter((item) => item.completed);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center animate-pulse">
        <div className="text-center">
          <div className="text-3xl mb-3 opacity-30">📋</div>
          <div className="text-xs font-medium text-gray-300">Loading lists...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-0 h-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="w-64 border-r border-gray-100 flex flex-col bg-gray-50/50">
        <div className="p-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-gray-800">Lists</h2>
            <p className="text-[10px] font-medium text-gray-400">{lists.length} Lists</p>
          </div>
          <button
            onClick={() => setShowNewList(!showNewList)}
            className="w-8 h-8 rounded-lg hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="19" cy="12" r="1"></circle>
              <circle cx="5" cy="12" r="1"></circle>
            </svg>
          </button>
        </div>

        {showNewList && (
          <form onSubmit={handleCreateList} className="mx-3 mb-3 p-3 bg-white rounded-xl border border-gray-200 flex flex-col gap-3">
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="List name..."
              className="text-sm bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              autoFocus
            />
            <div className="flex gap-1.5 flex-wrap">
              {LIST_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setNewListIcon(icon)}
                  className={`w-7 h-7 rounded-md flex items-center justify-center text-sm transition-all ${newListIcon === icon ? "bg-blue-100 ring-2 ring-blue-400 scale-110" : "hover:bg-gray-100"}`}
                >
                  {icon}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              {LIST_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewListColor(color)}
                  className={`w-6 h-6 rounded-full transition-all ${newListColor === color ? "ring-2 ring-offset-1 ring-gray-400 scale-110" : ""}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <button type="submit" className="bg-blue-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-blue-700 transition-all">
              Create List
            </button>
          </form>
        )}

        <div className="flex-1 overflow-y-auto px-2">
          {lists.map((list) => (
            <button
              key={list.id}
              onClick={() => {
                setActiveList(list.id);
                setEditingList(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all group mb-0.5 ${activeList === list.id ? "bg-blue-50 text-blue-700" : "hover:bg-gray-100 text-gray-700"}`}
            >
              <span className="text-base">{list.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{list.name}</div>
                <div className="text-[10px] text-gray-400 font-medium">Shared with all members</div>
              </div>
              <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{getItemCount(list)}</span>
            </button>
          ))}
        </div>

        <div className="p-3">
          <button
            onClick={() => setShowNewList(true)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {activeListData ? (
          <>
            <div className="p-6 text-white relative overflow-hidden" style={{ backgroundColor: activeListData.color }}>
              <div className="absolute inset-0 opacity-10">
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/20 rounded-full" />
                <div className="absolute -right-4 bottom-0 w-24 h-24 bg-white/10 rounded-full" />
              </div>
              <div className="relative flex items-start gap-3">
                <span className="text-2xl">{activeListData.icon}</span>
                <div className="flex-1">
                  <h2 className="text-xl font-black">{activeListData.name}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleActivity}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      <span>{activeListData.show_in_activity ? "●" : "○"}</span>
                      {activeListData.show_in_activity ? "Shown In Activity" : "Show In Activity"}
                    </button>
                    <button
                      type="button"
                      onClick={handleStartEditList}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      Edit List
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteList(activeListData.id)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/25 hover:bg-red-500/35 text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      Delete List
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {editingList && (
              <form onSubmit={handleSaveList} className="px-6 py-4 border-b border-gray-100 bg-gray-50/60 flex flex-col gap-3">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={editListName}
                    onChange={(e) => setEditListName(e.target.value)}
                    placeholder="List name..."
                    className="flex-1 text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    autoFocus
                  />
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all">
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingList(false)}
                    className="px-4 py-2 bg-white border border-gray-200 text-xs font-bold rounded-lg hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {LIST_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setEditListIcon(icon)}
                      className={`w-7 h-7 rounded-md flex items-center justify-center text-sm transition-all ${editListIcon === icon ? "bg-blue-100 ring-2 ring-blue-400 scale-110" : "hover:bg-gray-100"}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  {LIST_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditListColor(color)}
                      className={`w-6 h-6 rounded-full transition-all ${editListColor === color ? "ring-2 ring-offset-1 ring-gray-400 scale-110" : ""}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </form>
            )}

            <form onSubmit={handleAddItem} className="px-6 py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-300">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </div>
                <input
                  type="text"
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  placeholder="New Task"
                  className="flex-1 text-sm text-gray-700 placeholder-gray-400 bg-transparent focus:outline-none py-2"
                />
              </div>
            </form>

            <div className="flex-1 overflow-y-auto">
              {itemsLoading ? (
                <div className="p-12 text-center animate-pulse">
                  <div className="text-xs font-medium text-gray-300">Loading items...</div>
                </div>
              ) : (
                <>
                  {pendingItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 px-6 py-3.5 border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                      <button
                        onClick={() => handleToggle(item.id, item.completed)}
                        className="w-6 h-6 rounded-full border-2 border-red-300 flex-shrink-0 hover:border-red-500 hover:bg-red-50 transition-all"
                      />
                      <span className="flex-1 text-sm font-medium text-gray-800">{item.content}</span>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  ))}

                  {completedItems.length > 0 && (
                    <>
                      <div className="px-6 py-2 mt-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Completed ({completedItems.length})</span>
                      </div>
                      {completedItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 px-6 py-3 border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                          <button
                            onClick={() => handleToggle(item.id, item.completed)}
                            className="w-6 h-6 rounded-full bg-emerald-500 flex-shrink-0 flex items-center justify-center hover:bg-emerald-600 transition-all"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          </button>
                          <span className="flex-1 text-sm font-medium text-gray-400 line-through">{item.content}</span>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </>
                  )}

                  {items.length === 0 && (
                    <div className="p-12 text-center">
                      <div className="text-3xl mb-3 opacity-20">{activeListData.icon}</div>
                      <div className="text-xs font-medium text-gray-300">No items yet. Add your first task above.</div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-4 opacity-20">📋</div>
              <div className="text-sm font-bold text-gray-400">Select a list or create a new one</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
