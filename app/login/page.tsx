"use client";

import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    // 🛡️ Safety Redirect for 0.0.0.0 issue
    if (typeof window !== "undefined" && (window.location.hostname === "0.0.0.0" || window.location.hostname === "0.0.0.0:3000")) {
      window.location.href = window.location.href.replace("0.0.0.0", "localhost");
    }

    // 🛡️ Handle Auth Errors from fragments or search
    const handleErrors = async () => {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.replace('#', '?'));
      const errorCode = params.get('error_code') || new URLSearchParams(window.location.search).get('error_code');
      
      if (errorCode === 'identity_already_exists') {
        setMessage("Node already integrated. Returning to control center...");
        setTimeout(() => {
          router.push("/");
        }, 2000);
      }
    };
    handleErrors();
  }, [router]);
  
  const handleGoogleLogin = async () => {
    const supabase = createClient();
    
    // FORCE CLEAR: Wipe any stale localhost tokens to prevent 'missing sub claim' errors
    await supabase.auth.signOut();

    // Dynamic origin that fixes the 0.0.0.0 issue
    const origin = typeof window !== "undefined" 
      ? window.location.origin.replace("0.0.0.0", "localhost") 
      : "http://localhost:3000";

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        scopes: 'https://www.googleapis.com/auth/calendar.readonly'
      },
    });
    if (error) setMessage(error.message);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();
      const origin = typeof window !== "undefined" 
        ? window.location.origin.replace("0.0.0.0", "localhost") 
        : "http://localhost:3000";

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
        },
      });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage("Success! Check your email for the magic link.");
      }
    } catch (err: any) {
      setMessage(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-[#f8f9fa] p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-blue-500/5 border border-gray-100 p-12 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-blue-600 text-white rounded-[1.8rem] flex items-center justify-center mb-10 text-3xl font-black shadow-xl shadow-blue-600/20">
          R
        </div>
        
        <h1 className="text-[28px] font-black text-gray-800 mb-2 tracking-tighter">R.O.B.O.Y</h1>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-12">Household Identity Node</p>

        <form onSubmit={handleEmailLogin} className="w-full flex flex-col gap-3 mb-8">
          <input 
            type="email" 
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-gray-300"
          />
          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Deploy Magic Link"}
          </button>
        </form>

        <div className="flex items-center gap-4 w-full mb-8">
          <div className="h-px bg-gray-100 flex-1" />
          <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">or continue with</span>
          <div className="h-px bg-gray-100 flex-1" />
        </div>

        <button 
          onClick={handleGoogleLogin}
          className="w-full py-4 bg-white border border-gray-100 text-gray-700 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 hover:border-gray-200 transition-all flex items-center justify-center gap-3 active:scale-[0.98] shadow-sm"
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Google Identity
        </button>

        {message && (
          <div className="mt-8 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 w-full animate-in slide-in-from-bottom-2 duration-300">
             <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
