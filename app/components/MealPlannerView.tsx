"use client";
import { useEffect, useState, useMemo, useCallback } from "react";

type Ingredient = { id: string; ingredient: string; quantity: string; added_to_list: boolean };
type Recipe = {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  recipe_url?: string;
  instructions?: string;
  prep_time?: string;
  cook_time?: string;
  recipe_ingredients: Ingredient[];
};
type Meal = { 
  id: string; 
  date: string; 
  meal_type: string; 
  recipe_id?: string;
  name?: string; 
  recipe_url?: string; 
  image_url?: string;
  notes?: string; 
  recipes?: Recipe;
  meal_ingredients: Ingredient[];
};

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_COLORS: Record<string, string> = { breakfast: "#fbbc05", lunch: "#34a853", dinner: "#4285f4", snack: "#ea4335" };

function getWeekStart(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(start.getDate() + diff);
  return start;
}

export default function MealPlannerView() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [library, setLibrary] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(getWeekStart(new Date()));
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showAdd, setShowAdd] = useState<{ date: string; meal_type: string } | null>(null);
  const [form, setForm] = useState({ name: "", recipe_url: "", image_url: "", notes: "", ingredients: [] as string[] });
  const [newIngredient, setNewIngredient] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentWeek);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentWeek]);

  const loadMeals = useCallback(async () => {
    setLoading(true);
    try {
      const ws = currentWeek.toISOString().split("T")[0];
      const res = await fetch(`/api/meals?weekStart=${ws}`);
      const data = await res.json();
      setMeals(Array.isArray(data) ? data : []);
      
      const libRes = await fetch("/api/recipes");
      const libData = await libRes.json();
      setLibrary(Array.isArray(libData) ? libData : []);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }, [currentWeek]);

  useEffect(() => { loadMeals(); }, [loadMeals]);

  const [scrapeMessage, setScrapeMessage] = useState("");

  const handleScrape = async () => {
    if (!form.recipe_url) return;
    setScraping(true);
    setScrapeMessage("");
    try {
      const res = await fetch("/api/meals/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: form.recipe_url })
      });
      const data = await res.json();
      if (data.error) {
        setScrapeMessage("Could not reach that website.");
        return;
      }
      if (data.name) {
        setForm(prev => ({
          ...prev,
          name: data.name,
          image_url: data.image_url || prev.image_url,
          notes: data.instructions || prev.notes,
          ingredients: data.ingredients || prev.ingredients
        }));
        setScrapeMessage(data.partial ? "Imported partially. Please check details." : "Successfully imported!");
      }
    } catch (err) {
      console.error("Scrape failed:", err);
      setScrapeMessage("Failed to connect to the scraper.");
    } finally {
      setScraping(false);
    }
  };

  const handleAddMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAdd) return;
    setLoading(true);
    try {
      await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, date: showAdd.date, meal_type: showAdd.meal_type })
      });
      setShowAdd(null);
      setForm({ name: "", recipe_url: "", image_url: "", notes: "", ingredients: [] });
      loadMeals();
    } catch (err) {
      console.error("Failed to add meal:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMeal = async (id: string) => {
    if (!confirm("Delete this recipe?")) return;
    await fetch("/api/meals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
    setSelectedMeal(null);
    loadMeals();
  };

  const handleAddIngredient = async () => {
    if (!selectedMeal || !newIngredient.trim()) return;
    await fetch("/api/meals", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_ingredient", meal_plan_id: selectedMeal.id, ingredient: newIngredient, quantity: "" })
    });
    setNewIngredient("");
    
    const ws = currentWeek.toISOString().split("T")[0];
    const res = await fetch(`/api/meals?weekStart=${ws}`);
    const data = await res.json();
    const updated = (Array.isArray(data) ? data : []).find((m: Meal) => m.id === selectedMeal.id);
    if (updated) setSelectedMeal(updated);
    loadMeals();
  };

  const weekLabel = `${weekDays[0].toLocaleDateString("en-AU", { day: "numeric", month: "short" })} — ${weekDays[6].toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`;
  const [mode, setMode] = useState<"library" | "planner">("planner");

  const filteredLibrary = useMemo(() => {
    return library.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [library, searchQuery]);

  return (
    <div className="flex h-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden relative">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-100 flex flex-col bg-gray-50/30">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
             <h2 className="text-xl font-black text-gray-800">🍱 {mode === "library" ? "All recipes" : "Meal Slots"}</h2>
             <button onClick={() => setMode(mode === "library" ? "planner" : "library")} className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all">
               {mode === "library" ? "Planner" : "Library"}
             </button>
          </div>
          <div className="relative">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text" 
              placeholder="Search recipes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-xs shadow-sm focus:ring-4 focus:ring-blue-500/5 transition-all outline-none" 
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
           {mode === "library" ? (
             filteredLibrary.map((r) => (
              <div key={r.id} onClick={() => { setSelectedRecipe(r); setSelectedMeal(null); setMode("library"); }} className={`p-3 rounded-2xl border border-transparent bg-white shadow-sm flex gap-4 group cursor-pointer hover:border-blue-200 hover:shadow-md transition-all ${selectedRecipe?.id === r.id ? 'ring-2 ring-blue-500/10 border-blue-200 bg-blue-50/10' : ''}`}>
                  <div className="w-14 h-14 rounded-xl bg-gray-100 shrink-0 overflow-hidden shadow-inner">
                     {r.image_url ? (
                       <img src={r.image_url} alt={r.name} className="w-full h-full object-cover" />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center text-xl" style={{ backgroundColor: '#f3f4f6' }}>🍲</div>
                     )}
                  </div>
                  <div className="min-w-0 flex-1">
                     <div className="text-[11px] font-black text-gray-800 leading-tight mb-1 group-hover:text-blue-600 transition-colors">{r.name}</div>
                     <div className="text-[9px] font-bold text-gray-400 truncate uppercase tracking-tighter">
                        {r.recipe_url ? r.recipe_url.replace('https://','').replace('www.','').split('/')[0] : 'Manual Entry'}
                     </div>
                  </div>
              </div>
            ))
           ) : (
             MEAL_TYPES.map(type => (
               <button key={type} onClick={() => setMode("planner")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-gray-100 text-gray-600 transition-all">
                 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: MEAL_COLORS[type] }} />
                 <div className="text-xs font-bold capitalize">{type}</div>
               </button>
             ))
           )}
        </div>

        <div className="p-6 bg-white border-t border-gray-50">
           <button 
             onClick={() => setShowAdd({ date: new Date().toISOString().split("T")[0], meal_type: "dinner" })}
             className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
           >Create New Recipe</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {mode === "planner" ? (
          <div className="flex-1 flex flex-col h-full">
            <div className="flex items-center justify-between px-10 py-8 border-b border-gray-50">
               <div>
                 <h2 className="text-3xl font-black text-gray-800 tracking-tight">{weekLabel}</h2>
                 <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Household Meal Matrix</div>
               </div>
               <div className="flex items-center gap-4">
                  <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button onClick={() => setCurrentWeek(new Date(currentWeek.setDate(currentWeek.getDate() - 7)))} className="p-2 hover:bg-white rounded-lg transition-all text-gray-400 hover:text-gray-800">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>
                    <button onClick={() => setCurrentWeek(getWeekStart(new Date()))} className="px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-800">Today</button>
                    <button onClick={() => setCurrentWeek(new Date(currentWeek.setDate(currentWeek.getDate() + 7)))} className="p-2 hover:bg-white rounded-lg transition-all text-gray-400 hover:text-gray-800">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </button>
                  </div>
               </div>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <table className="w-full border-separate border-spacing-2">
                <thead>
                  <tr>
                    <th className="w-24 p-2" />
                    {weekDays.map((d, i) => (
                      <th key={i} className="p-4 text-center">
                        <div className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-1">{d.toLocaleDateString("en-AU", { weekday: "short" })}</div>
                        <div className={`text-2xl font-black transition-colors ${d.toDateString() === new Date().toDateString() ? 'text-blue-600' : 'text-gray-800'}`}>{d.getDate()}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MEAL_TYPES.map(type => (
                    <tr key={type}>
                      <td className="p-4 text-right align-middle">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{type}</div>
                      </td>
                      {weekDays.map((d, i) => {
                        const dateStr = d.toISOString().split("T")[0];
                        const slotMeals = meals.filter(m => m.date === dateStr && m.meal_type === type);
                        return (
                          <td key={i} className="align-top min-h-[120px] min-w-[150px]">
                            <div className="flex flex-col gap-2 p-3 bg-gray-50/50 rounded-2xl border border-transparent hover:border-blue-100 hover:bg-blue-50/30 transition-all group min-h-[100px]">
                              {slotMeals.map(m => (
                                <button key={m.id} onClick={() => { 
                                  setSelectedMeal(m); 
                                  setSelectedRecipe(m.recipes || null);
                                  setMode("library"); 
                                }}
                                  className="w-full text-left text-[10px] font-black text-white px-4 py-3 rounded-xl shadow-lg shadow-black/5 hover:scale-[1.02] active:scale-95 transition-all truncate"
                                  style={{ backgroundColor: MEAL_COLORS[type] }}>
                                  {m.recipes?.name || m.name}
                                </button>
                              ))}
                              <button onClick={() => setShowAdd({ date: d.toISOString().split("T")[0], meal_type: type })}
                                className="w-full py-2 flex items-center justify-center text-gray-200 hover:text-blue-400 hover:bg-white rounded-xl border border-dashed border-gray-200 transition-all text-xl font-black">+</button>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto bg-white">
            {(selectedMeal || selectedRecipe) ? (
              <div className="p-10 w-full">
                {/* Title + Actions */}
                <div className="flex items-start justify-between mb-8">
                   <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
                     {selectedRecipe?.name || selectedMeal?.name}
                   </h1>
                   <div className="flex items-center gap-2 shrink-0 ml-4">
                      <button className="p-2 text-gray-300 hover:text-blue-500 transition-colors"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg></button>
                      <button className="p-2 text-gray-300 hover:text-emerald-500 transition-colors"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg></button>
                      <button className="p-2 text-gray-300 hover:text-gray-800 transition-colors"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg></button>
                      <button className="p-2 text-gray-300 hover:text-rose-500 transition-colors"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg></button>
                      <div className="w-px h-5 bg-gray-100 mx-1" />
                      <button onClick={() => selectedMeal ? handleDeleteMeal(selectedMeal.id) : null} className="p-2 text-gray-300 hover:text-rose-500 transition-colors"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                      <button onClick={() => setMode("planner")} className="p-2 text-gray-300 hover:text-gray-800 transition-colors"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
                   </div>
                </div>

                {/* Image + Metadata Row */}
                <div className="flex gap-8 mb-8">
                   {(selectedRecipe?.image_url || selectedMeal?.image_url) && (
                     <div className="w-64 h-40 rounded-2xl overflow-hidden shrink-0 shadow-md">
                        <img src={selectedRecipe?.image_url || selectedMeal?.image_url} alt={selectedRecipe?.name || selectedMeal?.name} className="w-full h-full object-cover" />
                     </div>
                   )}
                   <div className="flex flex-col justify-center gap-3 text-sm text-gray-600">
                      <div className="flex items-center gap-3">
                         <span className="text-gray-400">⏱</span>
                         <span className="font-bold text-gray-500 w-32">Preparation</span>
                         <span className="font-black text-gray-800">{selectedRecipe?.prep_time || '20-30 min'}</span>
                      </div>
                      {selectedMeal && (
                        <div className="flex items-center gap-3">
                           <span className="text-gray-400">📅</span>
                           <span className="font-bold text-gray-500 w-32">Scheduled</span>
                           <span className="font-black text-gray-800">{new Date(selectedMeal.date).toLocaleDateString("en-AU", { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                        </div>
                      )}
                      {(selectedRecipe?.recipe_url || selectedMeal?.recipe_url) && (
                        <div className="flex items-center gap-3">
                           <span className="text-gray-400">🌐</span>
                           <span className="font-bold text-gray-500 w-32">View on</span>
                           <a href={selectedRecipe?.recipe_url || selectedMeal?.recipe_url} target="_blank" rel="noopener noreferrer" className="font-black text-blue-600 hover:underline">
                             {(selectedRecipe?.recipe_url || selectedMeal?.recipe_url)?.replace('https://','').replace('http://','').replace('www.','').split('/')[0]}
                           </a>
                        </div>
                      )}
                   </div>
                </div>

                {/* Two Column: Ingredients + Instructions */}
                <div className="grid grid-cols-2 gap-12">
                   {/* Ingredients */}
                   <div>
                      <h3 className="text-sm font-black text-gray-800 mb-4">Ingredients</h3>
                      <div className="space-y-2 mb-4">
                         {(selectedRecipe?.recipe_ingredients || selectedMeal?.meal_ingredients || []).length > 0 ? (
                           (selectedRecipe?.recipe_ingredients || selectedMeal?.meal_ingredients || []).map((ing, idx) => (
                             <div key={ing.id || idx} className="flex items-start gap-3 text-sm text-gray-700 py-1">
                               <span className="mt-1.5 shrink-0">•</span>
                               <span>{ing.ingredient}{ing.quantity ? ` (${ing.quantity})` : ''}</span>
                             </div>
                           ))
                         ) : (
                           <p className="text-sm text-gray-400 italic">No ingredients listed.</p>
                         )}
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Add ingredient..." 
                          value={newIngredient}
                          onChange={(e) => setNewIngredient(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddIngredient()}
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 transition-all outline-none" 
                        />
                        <button onClick={handleAddIngredient} className="px-3 py-2 bg-gray-800 text-white rounded-lg font-bold text-xs hover:bg-black transition-all">Add</button>
                      </div>
                   </div>

                   {/* Instructions */}
                   <div>
                      <h3 className="text-sm font-black text-gray-800 mb-4">Instructions</h3>
                      {(selectedRecipe?.instructions || selectedMeal?.notes) ? (
                        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {selectedRecipe?.instructions || selectedMeal?.notes}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic">No instructions provided.</p>
                      )}
                   </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-12 h-full bg-gray-50/30">
                <div className="max-w-xs">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-4xl shadow-xl mx-auto mb-8">🍱</div>
                  <h3 className="text-2xl font-black text-gray-800 mb-2 tracking-tight">Your Recipe Vault</h3>
                  <p className="text-xs font-bold text-gray-400 mb-8 uppercase tracking-widest">Select a meal from the planner to see the full details here.</p>
                  <button onClick={() => setMode("planner")} className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/10">Back to Planner</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(null)}>
           <div className="bg-white rounded-[3rem] w-full max-w-2xl p-12 shadow-2xl relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-emerald-400 to-yellow-400" />
              
              <h3 className="text-3xl font-black text-gray-800 mb-8 tracking-tight uppercase">Schedule {showAdd.meal_type}</h3>
              
              <div className="mb-10 p-6 bg-blue-50/50 rounded-3xl border border-blue-100 flex items-center gap-6">
                 <div className="flex-1">
                    <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Magic Recipe Importer</h4>
                    <input 
                      type="text" 
                      value={form.recipe_url} 
                      onChange={e => setForm({ ...form, recipe_url: e.target.value })} 
                      placeholder="Paste recipe URL here..." 
                      className="w-full bg-white border border-blue-100 rounded-xl px-5 py-3 text-sm font-medium focus:ring-4 focus:ring-blue-500/10 transition-all outline-none" 
                    />
                 </div>
                 <button 
                  onClick={handleScrape}
                  disabled={scraping || !form.recipe_url}
                  className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:grayscale mt-5"
                 >
                   {scraping ? "Scanning..." : "Magic Import"}
                 </button>
              </div>

              {scrapeMessage && (
                <div className={`p-4 rounded-2xl text-xs font-bold mb-4 ${scrapeMessage.includes('Partial') || scrapeMessage.includes('failed') || scrapeMessage.includes('Could not') ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                  {scrapeMessage}
                </div>
              )}

              <form onSubmit={handleAddMeal} className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Meal Name</label>
                    <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="What's for dinner?" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-black focus:ring-4 focus:ring-blue-500/5 transition-all outline-none" required />
                 </div>

                 {form.image_url && (
                   <div className="relative w-full h-32 rounded-2xl overflow-hidden shadow-inner bg-gray-100 group">
                      <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setForm({...form, image_url: ""})} className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                   </div>
                 )}

                 {form.ingredients.length > 0 && (
                   <div>
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-3 block">Scraped Ingredients ({form.ingredients.length})</label>
                     <div className="max-h-40 overflow-y-auto bg-gray-50 rounded-2xl border border-gray-100 p-4 space-y-2">
                       {form.ingredients.map((ing, i) => (
                         <div key={i} className="flex items-start gap-3 text-xs font-medium text-gray-700 group">
                           <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                           <span className="flex-1">{ing}</span>
                           <button type="button" onClick={() => setForm(prev => ({...prev, ingredients: prev.ingredients.filter((_, j) => j !== i)}))} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all text-[10px] font-black">✕</button>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}

                 <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Preparation Notes</label>
                    <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Paste instructions here..." rows={4} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-blue-500/5 transition-all outline-none resize-none" />
                 </div>

                 <div className="flex gap-4 pt-4">
                   <button 
                     type="submit" 
                     disabled={loading}
                     className="flex-1 py-5 bg-gray-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-2xl shadow-black/20 active:scale-95 disabled:opacity-50"
                   >
                     {loading ? "Saving..." : "Confirm Recipe"}
                   </button>
                   <button type="button" onClick={() => setShowAdd(null)} className="px-10 py-5 bg-gray-100 text-gray-400 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all">Cancel</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
