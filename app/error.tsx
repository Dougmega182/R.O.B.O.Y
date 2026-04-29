'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to help with debugging
    console.error('CRITICAL SYSTEM ERROR:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-red-100 p-12 flex flex-col items-center text-center">
        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-[1.8rem] flex items-center justify-center mb-10 text-3xl font-black">
          ⚠️
        </div>
        
        <h1 className="text-[24px] font-black text-gray-800 mb-2 tracking-tighter">Node Exception</h1>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-8">Household Operational Failure</p>

        <div className="w-full bg-gray-50 rounded-2xl p-6 mb-8 text-left overflow-auto max-h-48">
           <p className="text-[11px] font-bold text-red-500 font-mono break-words">
             {error.message || 'An unexpected error occurred in the R.O.B.O.Y core.'}
           </p>
           {error.digest && (
             <p className="text-[9px] text-gray-400 mt-2 font-mono uppercase">
               Digest: {error.digest}
             </p>
           )}
        </div>

        <div className="flex flex-col gap-3 w-full">
           <button 
             onClick={() => reset()}
             className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-[0.98]"
           >
             Re-Initialize Node
           </button>
           <button 
             onClick={() => window.location.href = '/'}
             className="w-full py-4 bg-white border border-gray-100 text-gray-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all"
           >
             Return to Dashboard
           </button>
        </div>
      </div>
    </div>
  )
}
