'use client'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 p-12 flex flex-col items-center text-center">
        <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-[1.8rem] flex items-center justify-center mb-10 text-3xl font-black">
          🔍
        </div>
        
        <h1 className="text-[24px] font-black text-gray-800 mb-2 tracking-tighter">Node Not Found</h1>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-12">The requested endpoint does not exist</p>

        <button 
          onClick={() => window.location.href = '/'}
          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-[0.98]"
        >
          Return to Command Center
        </button>
      </div>
    </div>
  )
}
