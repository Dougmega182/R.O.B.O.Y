"use client";

import { FeedItem, FeedStatus } from "@/lib/types/feed";
import { Member } from "@/lib/members"; // 🚀 Fixed Import
import { canApprove, canArchive } from "@/lib/auth/guards";
import MemberAvatar from "./MemberAvatar";

export default function DetailDrawer({
  item,
  currentUser,
  onClose,
  onUpdateStatus
}: {
  item: FeedItem | null;
  currentUser: Member; // 🚀 Fixed Type
  onClose: () => void;
  onUpdateStatus: (id: string, status: FeedStatus) => void;
}) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
      
      {/* Backdrop */}
      <div 
        className="flex-1 bg-slate-900/20 backdrop-blur-[2px]" 
        onClick={onClose}
      />

      {/* Side Panel */}
      <div className="w-[420px] bg-white h-full shadow-2xl border-l border-gray-200 flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
            {item.type} Details
          </span>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-800 hover:bg-gray-50 rounded-full transition-all"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-8 flex-1 overflow-y-auto">
          
          <div className="flex items-center gap-4 mb-8">
            <MemberAvatar avatar={item.avatar} color={item.color || "bg-pink-500"} className="w-12 h-12 rounded-full" textClassName="font-bold text-lg" alt={item.actor} />
            <div>
              <div className="font-bold text-gray-900 text-lg">{item.actor}</div>
              <div className="text-sm text-gray-400">{item.time} Today</div>
            </div>
          </div>

          <div 
            className="w-full h-1 rounded-full mb-6" 
            style={{ backgroundColor: item.color }} 
          />

          <h2 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">
            {item.title}
          </h2>

          {item.subtitle && (
            <p className="text-gray-600 mb-8 leading-relaxed">
              {item.subtitle}
            </p>
          )}

          <div className="flex items-center gap-2 mb-10">
            <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest ${
              item.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
            }`}>
              Status: {item.status}
            </span>
          </div>

          {/* Action Zone: This is where transitions happen */}
          <div className="mt-auto border-t border-gray-100 pt-8 space-y-3">
            {item.status === 'pending' && (
              <div className="space-y-3">
                {currentUser.role === 'ADMIN' ? (
                  <button 
                    onClick={() => onUpdateStatus(item.id, 'active')}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20"
                  >
                    Approve & Activate
                  </button>
                ) : (
                  <div className="w-full py-4 bg-gray-50 border border-gray-100 text-gray-400 rounded-xl font-bold flex flex-col items-center justify-center">
                    <span className="text-xs uppercase tracking-widest">Waiting for Approval</span>
                    <span className="text-[10px] font-normal italic opacity-70">Only Parents can approve chores</span>
                  </div>
                )}
              </div>
            )}

            <button className="w-full py-4 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl font-bold transition-all">
              Edit Details
            </button>
            
            {/* Only the creator or Dale can delete/archive */}
            {(currentUser.role === 'ADMIN' || currentUser.id === item.actorMemberId) && (
              <button 
                onClick={() => onUpdateStatus(item.id, 'archived')}
                className="w-full py-2 text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Cancel this {item.type}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

