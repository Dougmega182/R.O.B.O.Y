"use client";
import { useEffect, useState, useCallback } from "react";
import { Member } from "@/lib/members";

type Album = { id: string; name: string; icon: string; member_id?: string; gallery_photos?: { count: number }[] };
type Photo = { id: string; url: string; caption?: string; created_at: string };

export default function GalleryView({ members }: { members: Member[] }) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlbum, setSelectedAlbum] = useState<string>("all");
  const [showAddPhoto, setShowAddPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [showGooglePhotos, setShowGooglePhotos] = useState(false);
  const [googlePhotos, setGooglePhotos] = useState<any[]>([]);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [slideshowIndex, setSlideshowIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const loadAlbums = useCallback(async () => {
    try {
      const res = await fetch("/api/gallery/albums");
      const data = await res.json();
      setAlbums(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load albums:", err);
      setAlbums([]);
    }
  }, []);

  const loadPhotos = useCallback(async (albumId: string) => {
    setLoading(true);
    try {
      const url = albumId === "all" ? "/api/gallery/photos" : `/api/gallery/photos?album_id=${albumId}`;
      const res = await fetch(url);
      const data = await res.json();
      setPhotos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load photos:", err);
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadGooglePhotos = async () => {
    setGoogleLoading(true);
    setGoogleError(null);
    try {
      const res = await fetch("/api/gallery/google");
      const data = await res.json();
      
      if (res.status === 401) {
        setGoogleError("AUTH_REQUIRED");
      } else if (res.status === 403 || data.error?.code === 403) {
        setGoogleError("PERMISSION_DENIED");
      } else if (!res.ok) {
        throw new Error(data.error || "Failed to load");
      } else {
        setGooglePhotos(data.photos || []);
      }
    } catch (err) {
      console.error("Failed to load Google photos:", err);
      setGoogleError("CONNECTION_ERROR");
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    loadAlbums();
    loadPhotos("all");
  }, [loadAlbums, loadPhotos]);

  useEffect(() => {
    if (showGooglePhotos) loadGooglePhotos();
  }, [showGooglePhotos]);

  const handleAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoUrl.trim() || selectedAlbum === "all") {
       alert("Please select an album first!");
       return;
    }
    await fetch("/api/gallery/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ album_id: selectedAlbum, url: photoUrl })
    });
    setPhotoUrl("");
    setShowAddPhoto(false);
    loadPhotos(selectedAlbum);
  };

  const handleImportGooglePhoto = async (url: string, caption?: string) => {
    if (selectedAlbum === "all") {
       alert("Please select a specific album (like yours) to import into!");
       return;
    }
    await fetch("/api/gallery/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ album_id: selectedAlbum, url, caption })
    });
    setShowGooglePhotos(false);
    loadPhotos(selectedAlbum);
  };

  const currentAlbumName = selectedAlbum === "all" ? "All photos" : albums.find(a => a.id === selectedAlbum)?.name || "Album";

  const isAuthError = googleError === "PERMISSION_DENIED" || googleError === "AUTH_REQUIRED";

  const nextPhoto = useCallback(() => {
    if (photos.length === 0) return;
    setSlideshowIndex(prev => (prev !== null ? (prev + 1) % photos.length : 0));
  }, [photos.length]);

  const prevPhoto = useCallback(() => {
    if (photos.length === 0) return;
    setSlideshowIndex(prev => (prev !== null ? (prev - 1 + photos.length) % photos.length : 0));
  }, [photos.length]);

  // Auto-cycle logic
  useEffect(() => {
    let interval: any;
    if (isPlaying && slideshowIndex !== null) {
      interval = setInterval(nextPhoto, 5000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, slideshowIndex, nextPhoto]);

  // Preloading logic
  useEffect(() => {
    if (slideshowIndex !== null && photos.length > 0) {
      const nextIndex = (slideshowIndex + 1) % photos.length;
      const img = new Image();
      img.src = photos[nextIndex].url;
    }
  }, [slideshowIndex, photos]);

  return (
    <div className="flex h-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-100 flex flex-col bg-gray-50/50">
        <div className="p-6">
          <h2 className="text-xl font-black text-gray-800">Gallery</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-6">
          {/* Family Albums */}
          <div>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Family Albums</h3>
            <button onClick={() => { setSelectedAlbum("all"); loadPhotos("all"); }} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left mb-1 transition-all ${selectedAlbum === "all" ? "bg-blue-50 text-blue-700 shadow-sm" : "hover:bg-gray-100 text-gray-600"}`}>
              <div className="w-8 h-8 rounded-lg bg-emerald-400 text-white flex items-center justify-center text-sm">📷</div>
              <div>
                <div className="text-xs font-bold">All photos</div>
                <div className="text-[10px] opacity-60">{photos.length} Photo{photos.length !== 1 ? 's' : ''}</div>
              </div>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left mb-1 hover:bg-gray-100 text-gray-600">
              <div className="w-8 h-8 rounded-lg bg-rose-400 text-white flex items-center justify-center text-sm">❤️</div>
              <div>
                <div className="text-xs font-bold">Favorites</div>
                <div className="text-[10px] opacity-60">No photo</div>
              </div>
            </button>
          </div>

          {/* Members' Albums */}
          <div>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Members&apos; Albums</h3>
            {members.map(m => (
              <button key={m.id} onClick={() => { setSelectedAlbum(m.id); loadPhotos(m.id); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left mb-1 transition-all ${selectedAlbum === m.id ? "bg-blue-50 text-blue-700 shadow-sm" : "hover:bg-gray-100 text-gray-600"}`}>
                <div className={`w-8 h-8 rounded-lg ${m.color} text-white flex items-center justify-center text-[10px] font-bold`}>{m.avatar}</div>
                <div>
                  <div className="text-xs font-bold">{m.name}</div>
                  <div className="text-[10px] opacity-60">No photo</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 flex flex-col">
        <header className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-gray-800">{currentAlbumName}</h3>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">{photos.length} Photo{photos.length !== 1 ? 's' : ''}</div>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={() => { setSlideshowIndex(0); setIsPlaying(true); }} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-900/20 active:scale-95">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z"></path></svg>
                Slideshow
             </button>
             <button onClick={() => setShowGooglePhotos(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm">
                <svg width="14" height="14" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Google Photos
             </button>
             <button onClick={() => setShowAddPhoto(true)} className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 shadow-lg shadow-blue-500/20">+</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {showAddPhoto && (
            <form onSubmit={handleAddPhoto} className="mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-100 flex gap-4 animate-in slide-in-from-top duration-300">
              <input type="url" value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="Photo URL..." className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none" autoFocus />
              <button type="submit" className="px-6 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase">Add Photo</button>
              <button type="button" onClick={() => setShowAddPhoto(false)} className="px-4 bg-gray-200 text-gray-600 rounded-xl font-bold text-xs uppercase">Cancel</button>
            </form>
          )}

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
              {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="aspect-square bg-gray-100 rounded-2xl" />)}
            </div>
          ) : photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="text-6xl mb-6 opacity-30">🖼️</div>
              <div className="text-sm font-black uppercase tracking-[0.2em] text-gray-400 mb-2">No Photos Found</div>
              <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-8 max-w-xs mx-auto">Either this album is empty, or the Google Photos connection needs a refresh.</p>
              <button 
                onClick={() => setShowGooglePhotos(true)} 
                className="px-6 py-3 bg-gray-100 text-gray-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
              >
                Sync Google Photos
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {photos.map(p => (
                <div key={p.id} className="aspect-square rounded-2xl overflow-hidden group relative border border-gray-100 shadow-sm">
                  <img src={p.url} alt={p.caption} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      onClick={() => { setSlideshowIndex(photos.indexOf(p)); setIsPlaying(false); }}
                      className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/40 transition-all"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Google Photos Modal */}
      {showGooglePhotos && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setShowGooglePhotos(false)}>
           <div className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
              <header className="p-8 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-gray-800">Select from Google Photos</h2>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Click a photo to import it into {currentAlbumName}</p>
                </div>
                <button onClick={() => setShowGooglePhotos(false)} className="w-10 h-10 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center hover:bg-gray-200 transition-all">×</button>
              </header>
              <div className="flex-1 overflow-y-auto p-8">
                 {googleLoading ? (
                   <div className="flex flex-col items-center justify-center py-24 gap-4">
                     <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                     <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Syncing with Google...</span>
                   </div>
                 ) : isAuthError ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center gap-6">
                       <div className="text-5xl">🔐</div>
                       <div>
                         <h3 className="text-lg font-black text-gray-800 mb-2">
                           {googleError === "PERMISSION_DENIED" ? "Permission Required" : "Identity Verification"}
                         </h3>
                         <p className="text-xs text-gray-400 font-bold max-w-sm mx-auto">
                           {googleError === "PERMISSION_DENIED" 
                             ? "Google Photos requires additional permissions to browse your library."
                             : "We're connected to your Google account, but we need to re-verify your identity to access your photos."}
                         </p>
                       </div>
                       <button 
                         onClick={async () => {
                           const { createClient } = await import("@/lib/supabase/client");
                           const supabase = createClient();
                           const origin = window.location.origin.replace('0.0.0.0', 'localhost');
                           await supabase.auth.linkIdentity({ 
                             provider: 'google',
                             options: {
                               redirectTo: `${origin}/auth/callback?provider=google&next=${encodeURIComponent('/?view=gallery')}`,
                               scopes: 'openid email profile https://www.googleapis.com/auth/photoslibrary.readonly',
                               queryParams: {
                                 access_type: 'offline',
                                 prompt: 'consent'
                               }
                             }
                           });
                         }}
                         className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                       >
                         Re-authorize Google Photos
                       </button>
                    </div>
                 ) : googlePhotos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center opacity-30">
                       <div className="text-6xl mb-4">🖼️</div>
                       <div className="text-sm font-black uppercase tracking-[0.2em]">No Photos Found in Library</div>
                    </div>
                 ) : (
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {googlePhotos.map(p => (
                        <div key={p.id} onClick={() => handleImportGooglePhoto(p.url, p.caption)} className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:ring-4 hover:ring-blue-500 transition-all group relative shadow-md">
                           <img src={p.url} className="w-full h-full object-cover" alt="" />
                           <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="bg-white text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">Select</span>
                           </div>
                        </div>
                      ))}
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}
      {/* Slideshow Modal */}
      {slideshowIndex !== null && photos[slideshowIndex] && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center animate-in fade-in duration-500">
           {/* Top Bar */}
           <div className="absolute top-0 left-0 right-0 p-8 flex items-center justify-between z-10">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mb-1">{currentAlbumName}</span>
                <span className="text-[14px] font-black text-white uppercase tracking-tight">{photos[slideshowIndex].caption || `Photo ${slideshowIndex + 1} of ${photos.length}`}</span>
              </div>
              <button onClick={() => { setSlideshowIndex(null); setIsPlaying(false); }} className="w-12 h-12 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
           </div>

           {/* Image Viewer */}
           <div className="relative w-full h-full flex items-center justify-center p-12 md:p-24">
              <img 
                key={photos[slideshowIndex].id}
                src={photos[slideshowIndex].url} 
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-700" 
                alt=""
              />
              
              {/* Controls Overlay */}
              <div className="absolute inset-y-0 left-0 w-32 flex items-center justify-center group/nav">
                 <button onClick={prevPhoto} className="w-16 h-16 bg-white/5 text-white rounded-full flex items-center justify-center opacity-0 group-hover/nav:opacity-100 hover:bg-white/20 transition-all -translate-x-4 group-hover/nav:translate-x-0 duration-300">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6"></polyline></svg>
                 </button>
              </div>
              <div className="absolute inset-y-0 right-0 w-32 flex items-center justify-center group/nav">
                 <button onClick={nextPhoto} className="w-16 h-16 bg-white/5 text-white rounded-full flex items-center justify-center opacity-0 group-hover/nav:opacity-100 hover:bg-white/20 transition-all translate-x-4 group-hover/nav:translate-x-0 duration-300">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6"></polyline></svg>
                 </button>
              </div>
           </div>

           {/* Bottom Bar */}
           <div className="absolute bottom-0 left-0 right-0 p-12 flex flex-col items-center gap-8">
              <div className="flex items-center gap-6">
                 <button onClick={prevPhoto} className="p-2 text-white/40 hover:text-white transition-all"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 20L9 12l10-8v16zM5 4v16h2V4H5z"/></svg></button>
                 <button onClick={() => setIsPlaying(!isPlaying)} className="w-20 h-20 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-all active:scale-95 shadow-2xl">
                    {isPlaying ? (
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                    ) : (
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="translate-x-0.5"><path d="M5 3l14 9-14 9V3z"></path></svg>
                    )}
                 </button>
                 <button onClick={nextPhoto} className="p-2 text-white/40 hover:text-white transition-all"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M5 4l10 8-10 8V4zm14 0v16h-2V4h2z"/></svg></button>
              </div>
              
              {/* Progress Track */}
              <div className="w-full max-w-md h-1 bg-white/10 rounded-full overflow-hidden">
                 <div 
                    className="h-full bg-white transition-all duration-[5000ms] ease-linear" 
                    style={{ width: isPlaying ? '100%' : '0%', transitionDuration: isPlaying ? '5000ms' : '0ms' }}
                    key={`${slideshowIndex}-${isPlaying}`}
                 />
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
