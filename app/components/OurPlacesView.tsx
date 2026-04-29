"use client";
import { useEffect, useState, useCallback } from "react";

import dynamic from "next/dynamic";

const MapComponent = dynamic(() => import("./MapComponent"), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading Satellite Link...</div>
});

type Place = { id: string; name: string; address: string; lat?: number; lng?: number; category: string };

export default function OurPlacesView() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", category: "Favorite" });
  const [mapCenter, setMapCenter] = useState<[number, number]>([-37.8136, 144.9631]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/places");
      const data = await res.json();
      const validPlaces = Array.isArray(data) ? data : [];
      setPlaces(validPlaces);
      
      // If we have places, center on the first one
      if (validPlaces.length > 0 && validPlaces[0].lat && validPlaces[0].lng) {
        setMapCenter([validPlaces[0].lat, validPlaces[0].lng]);
      }
    } catch (err) {
      console.error("Failed to load places:", err);
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.address.trim()) return;
    await fetch("/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setForm({ name: "", address: "", category: "Favorite" });
    setShowAdd(false);
    load();
  };

  return (
    <div className="flex gap-0 h-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden relative">
      {/* Map Main Area */}
      <div className="flex-1 relative bg-gray-100">
        <MapComponent places={places} center={mapCenter} />
        
        {/* Map Overlays */}
        <div className="absolute bottom-6 left-6 z-[1000]">
           <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-xl px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest shadow-xl">
             Melbourne Node · Active
           </div>
        </div>
      </div>

      {/* Sidebar List */}
      <div className="w-80 border-l border-gray-100 flex flex-col bg-gray-50/50">
        <header className="p-6 border-b border-gray-100 bg-white flex items-center justify-between">
           <h2 className="text-xl font-black text-gray-800">Our places</h2>
           <button onClick={() => setShowAdd(false)} className="text-gray-300 hover:text-gray-500"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        </header>

        <div className="flex-1 flex flex-col overflow-y-auto">
          {showAdd ? (
            <div className="p-6 space-y-6">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Add New Spot</h3>
              <form onSubmit={handleAdd} className="space-y-4">
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Spot Name</label>
                   <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs" placeholder="e.g. Favorite Park" />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Address / Location</label>
                   <textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs resize-none" rows={3} placeholder="Paste address or coordinates..." />
                 </div>
                 <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20">Add place</button>
                 <button type="button" onClick={() => setShowAdd(false)} className="w-full py-4 bg-gray-200 text-gray-600 rounded-2xl font-black text-xs uppercase tracking-widest">Cancel</button>
              </form>
            </div>
          ) : places.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
               <div className="text-5xl mb-6 opacity-20">📍</div>
               <h3 className="text-xl font-black text-gray-800 mb-3">No favorite places yet</h3>
               <p className="text-xs font-bold text-gray-400 leading-relaxed mb-8 px-4">Find here all your family&apos;s favorite spots, so you can effortlessly inform them when you&apos;ve arrived at your destination.</p>
               <button onClick={() => setShowAdd(true)} className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Add a place</button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
               {places.map(p => (
                 <div key={p.id} className="p-6 hover:bg-white transition-all cursor-pointer group">
                   <div className="text-sm font-black text-gray-800 group-hover:text-blue-600 mb-1">{p.name}</div>
                   <div className="text-[10px] font-bold text-gray-400 leading-normal">{p.address}</div>
                 </div>
               ))}
               <button onClick={() => setShowAdd(true)} className="w-full p-6 text-center text-xs font-black text-blue-500 uppercase tracking-widest hover:bg-white transition-all">+ Add more</button>
            </div>
          )}
        </div>
      </div>

      {/* Fab */}
      <button onClick={() => setShowAdd(true)} className="absolute bottom-8 right-88 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-20">
         <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      </button>
    </div>
  );
}
