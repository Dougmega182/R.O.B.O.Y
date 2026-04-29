"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function OAuthConsentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // OAuth Params
  const clientId = searchParams.get("client_id");
  const scope = searchParams.get("scope");
  const redirectUri = searchParams.get("redirect_uri");
  const state = searchParams.get("state");

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        // Redirect to login if not authenticated
        const currentPath = window.location.pathname + window.location.search;
        router.push(`/login?returnTo=${encodeURIComponent(currentPath)}`);
        return;
      }
      setUser(data.user);
      setLoading(false);
    };
    checkUser();
  }, [router, supabase.auth]);

  const handleAuthorize = () => {
    // Construct the Supabase Authorization URL with confirm=true
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const authUrl = new URL(`${supabaseUrl}/auth/v1/oauth/authorize`);
    
    // Pass through all original params
    searchParams.forEach((value, key) => {
      authUrl.searchParams.set(key, value);
    });
    
    // Add the confirmation flag
    authUrl.searchParams.set("confirm", "true");

    // Redirect to Supabase to complete the handshake
    window.location.href = authUrl.toString();
  };

  const handleCancel = () => {
    if (redirectUri) {
      const url = new URL(redirectUri);
      url.searchParams.set("error", "access_denied");
      if (state) url.searchParams.set("state", state);
      window.location.href = url.toString();
    } else {
      router.push("/");
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f8f9fa]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-6 font-sans">
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        
        {/* Header Section */}
        <div className="bg-blue-600 p-8 text-center text-white relative">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-[0.4em] opacity-50">Identity Provider</div>
          <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/20 shadow-xl">
             <span className="text-4xl font-black">R</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">R.O.B.O.Y</h1>
          <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mt-1 opacity-80">Authorization Requested</p>
        </div>

        <div className="p-10 space-y-8">
          {/* Content */}
          <div className="text-center space-y-3">
             <div className="text-sm font-bold text-gray-800">
                An external application is requesting access to your <span className="text-blue-600">Psaila Household</span> data.
             </div>
             <div className="inline-flex items-center gap-2 bg-gray-50 px-4 py-1.5 rounded-full border border-gray-100">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">Verified Client: {clientId || "Third Party"}</span>
             </div>
          </div>

          {/* Scopes Section */}
          <div className="space-y-4">
             <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Requested Permissions</h2>
             <div className="space-y-2">
                {scope?.split(" ").map((s) => (
                  <div key={s} className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-blue-200 transition-all">
                     <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-500 shadow-sm">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                     </div>
                     <div>
                        <div className="text-xs font-black text-gray-700 uppercase tracking-tight">{s.replace("https://www.googleapis.com/auth/", "")}</div>
                        <div className="text-[10px] font-medium text-gray-400">Full read access to this scope</div>
                     </div>
                  </div>
                ))}
                {!scope && (
                  <div className="text-xs text-center text-gray-400 italic py-4">No specific scopes requested</div>
                )}
             </div>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
             <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-600/20">
                {user?.email?.[0].toUpperCase()}
             </div>
             <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Active Session</div>
                <div className="text-xs font-bold text-gray-800 truncate">{user?.email}</div>
             </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
             <button 
               onClick={handleAuthorize}
               className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/25 active:scale-95"
             >
               Allow Access
             </button>
             <button 
               onClick={handleCancel}
               className="w-full py-4 bg-white text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-red-500 hover:bg-red-50 transition-all active:scale-95"
             >
               Deny & Cancel
             </button>
          </div>

          <div className="text-center">
             <p className="text-[9px] font-medium text-gray-400 leading-relaxed max-w-[240px] mx-auto">
                By allowing access, you permit this application to view your node data as defined by the scopes above.
             </p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function OAuthConsent() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-[#f8f9fa]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
      <OAuthConsentContent />
    </Suspense>
  );
}
