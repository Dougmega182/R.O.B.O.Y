"use client";

import { FeedItem } from "@/lib/types/feed";
import MemberAvatar from "./MemberAvatar";

export default function FamilyFeed({ 
  items, 
  onSelect 
}: { 
  items: FeedItem[], 
  onSelect: (item: FeedItem) => void 
}) {
  return (
    <div className="flex flex-col gap-5">
      {items.map((item) => (
        <div 
          key={item.id} 
          className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col cursor-pointer hover:shadow-md hover:border-blue-200 transition-all ${
            item.status === 'pending' ? 'opacity-90' : ''
          }`}
          onClick={() => onSelect(item)}
        >
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MemberAvatar avatar={item.avatar} color={item.color} className="w-10 h-10 rounded-full shadow-inner" textClassName="font-bold" alt={item.actor} />
              <div>
                <div className="font-bold text-sm text-gray-800">
                  {item.actor} • <span className="text-gray-400 font-normal uppercase text-[10px] tracking-tighter">{item.role}</span>
                </div>
                <div className="text-[10px] text-gray-400 font-medium">{item.time} Today</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
               {/* Recurrence Badge */}
               {item.recurrence && item.recurrence !== 'none' && (
                 <span className="text-[9px] font-black uppercase text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded tracking-tighter flex items-center gap-1">
                   <span className="text-[12px]">∞</span> {item.recurrence}
                 </span>
               )}
               
               {/* Status Badge */}
               {item.status !== 'active' && (
                 <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-sm ${
                   item.status === 'pending' ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-400'
                 }`}>
                   {item.status}
                 </span>
               )}
            </div>
          </div>
          
          <div className="flex">
            <div className="w-1.5" style={{ backgroundColor: item.color }}></div>
            <div className="flex-1 p-5">
              <div className="font-bold text-gray-800 mb-1 flex items-center gap-2 text-lg">
                <span className="text-xl opacity-80">{item.icon}</span> {item.title}
              </div>
              {item.subtitle && <div className="text-sm text-gray-500 font-medium leading-relaxed">{item.subtitle}</div>}
            </div>
          </div>
          
          <div className="px-4 py-2 border-t border-gray-50 flex items-center justify-between bg-gray-50/50">
             <div className="flex items-center gap-2">
               <MemberAvatar avatar={item.avatar} color={item.color} className="w-5 h-5 rounded-full opacity-30" textClassName="text-[8px] font-bold" alt={item.actor} />
               <div className="text-[10px] text-gray-300 italic font-medium">No comments yet</div>
             </div>
             <div className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">Detail View ➔</div>
          </div>
        </div>
      ))}
      
      {items.length === 0 && (
        <div className="p-16 text-center bg-white border-2 border-dashed border-gray-100 rounded-3xl">
          <div className="text-5xl mb-6 grayscale opacity-20">📭</div>
          <div className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">No Recent Activity Yet</div>
          <div className="text-xs text-gray-300 mt-2 italic">This area shows household updates like chores, reminders, messages, and shared activity.</div>
        </div>
      )}
    </div>
  );
}

