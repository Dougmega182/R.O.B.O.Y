"use client";
import { useEffect, useState, useCallback } from "react";
import { Member } from "@/lib/members";

type Conversation = {
  id: string;
  name: string;
  created_at: string;
  last_message_at: string;
  conversation_participants: {
    member_id: string;
    last_read_at: string;
    household_members: { name: string; avatar: string; color: string };
  }[];
};

type Message = {
  id: string;
  content: string;
  member_id: string;
  created_at: string;
  household_members: { name: string; avatar: string; color: string };
};

export default function MessageCenterView({ members, initialConvId }: { members: Member[], initialConvId?: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(initialConvId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [currentSenderId, setCurrentSenderId] = useState<string>(members[0]?.id || "");
  const [showNewConv, setShowNewConv] = useState(false);
  const [newConvName, setNewConvName] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      setConversations(Array.isArray(data) ? data : []);
      if (!selectedConvId && data.length > 0) {
        setSelectedConvId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedConvId]);

  const loadMessages = useCallback(async () => {
    if (!selectedConvId) return;
    try {
      const res = await fetch(`/api/messages?conversation_id=${selectedConvId}`);
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
      
      // Mark as read
      await fetch(`/api/conversations/${selectedConvId}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: currentSenderId })
      });
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  }, [selectedConvId, currentSenderId]);

  useEffect(() => { loadConversations(); }, [loadConversations]);
  useEffect(() => { loadMessages(); }, [loadMessages]);

  useEffect(() => {
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    if (initialConvId) setSelectedConvId(initialConvId);
  }, [initialConvId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !selectedConvId || !currentSenderId) return;

    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        member_id: currentSenderId,
        conversation_id: selectedConvId
      })
    });

    setContent("");
    loadMessages();
  };

  const handleCreateConv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConvName.trim() || selectedParticipants.length === 0) return;

    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newConvName,
        memberIds: Array.from(new Set([...selectedParticipants, currentSenderId]))
      })
    });

    if (res.ok) {
      const data = await res.json();
      setSelectedConvId(data.id);
      setShowNewConv(false);
      setNewConvName("");
      setSelectedParticipants([]);
      loadConversations();
    }
  };

  const currentSender = members.find(m => m.id === currentSenderId);
  const selectedConv = conversations.find(c => c.id === selectedConvId);

  return (
    <div className="flex h-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden relative">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-100 flex flex-col bg-gray-50/30">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-gray-800">Messages</h2>
            <button 
              onClick={() => setShowNewConv(true)}
              className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 transition-all shadow-md"
            >
              +
            </button>
          </div>
          
          <div className="space-y-2 overflow-y-auto">
            {conversations.map(conv => {
              const myParticipant = conv.conversation_participants.find(p => p.member_id === currentSenderId);
              const hasUnread = myParticipant && conv.last_message_at > myParticipant.last_read_at;

              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  className={`w-full p-4 rounded-xl text-left transition-all relative ${
                    selectedConvId === conv.id 
                      ? 'bg-white shadow-md border border-gray-100 scale-[1.02]' 
                      : 'hover:bg-white/60 text-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {conv.conversation_participants.slice(0, 3).map((p, i) => (
                        <div key={i} className={`w-6 h-6 rounded-full border-2 border-white ${p.household_members.color} flex items-center justify-center text-[8px] text-white font-bold`}>
                          {p.household_members.avatar}
                        </div>
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-black text-gray-800 truncate">{conv.name || "Conversation"}</div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        {conv.conversation_participants.length} members
                      </div>
                    </div>
                    {hasUnread && <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedConv ? (
          <>
            <header className="px-8 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="text-sm font-black text-gray-800">{selectedConv.name}</div>
                 <div className="flex items-center -space-x-1">
                   {selectedConv.conversation_participants.map(p => (
                     <div key={p.member_id} className={`w-5 h-5 rounded-full border border-white ${p.household_members.color} flex items-center justify-center text-[7px] text-white font-black`} title={p.household_members.name}>
                       {p.household_members.avatar}
                     </div>
                   ))}
                 </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
              {messages.map(m => (
                <div key={m.id} className={`flex items-start gap-3 ${m.member_id === currentSenderId ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full ${m.household_members.color} text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0`}>
                    {m.household_members.avatar}
                  </div>
                  <div className={`max-w-[70%] ${m.member_id === currentSenderId ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{m.household_members.name}</span>
                    </div>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      m.member_id === currentSenderId 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-gray-100 text-gray-700 rounded-tl-none'
                    }`}>
                      {m.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input & Sender Selector */}
            <div className="p-8 border-t border-gray-100 bg-gray-50/30">
               <div className="flex items-center gap-4 mb-4">
                 <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Speaking as:</span>
                 <div className="flex gap-2">
                   {members.map(m => (
                     <button
                        key={m.id}
                        onClick={() => setCurrentSenderId(m.id)}
                        className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center text-lg ${
                          currentSenderId === m.id 
                            ? `${m.color} text-white shadow-lg ring-2 ring-blue-100 scale-110` 
                            : 'bg-white text-gray-300 border border-gray-100 hover:scale-105'
                        }`}
                        title={m.name}
                     >
                       {m.avatar}
                     </button>
                   ))}
                 </div>
               </div>
               
               <form onSubmit={handleSend} className="relative flex gap-3">
                  <input 
                    type="text"
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder={`Message as ${currentSender?.name || '...'}`}
                    className="flex-1 bg-white border border-gray-200 rounded-2xl px-6 py-4 text-sm font-semibold shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                  />
                  <button type="submit" className="px-6 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
                    Send
                  </button>
               </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-30">
            <div className="text-8xl mb-6">💬</div>
            <div className="text-sm font-black uppercase tracking-[0.4em]">Select a node to begin</div>
          </div>
        )}
      </div>

      {/* New Conversation Modal */}
      {showNewConv && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setShowNewConv(false)}>
           <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h2 className="text-2xl font-black text-gray-800 mb-2">New Conversation</h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-8">Establish a new relational link</p>
              
              <form onSubmit={handleCreateConv} className="space-y-6">
                 <div>
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Conversation Name</label>
                   <input 
                    type="text" 
                    value={newConvName}
                    onChange={e => setNewConvName(e.target.value)}
                    placeholder="e.g. Secret Dinner Plans"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all"
                   />
                 </div>

                 <div>
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block ml-1">Select Participants</label>
                   <div className="grid grid-cols-2 gap-2">
                     {members.filter(m => m.id !== currentSenderId).map(m => (
                       <button
                         key={m.id}
                         type="button"
                         onClick={() => {
                           setSelectedParticipants(prev => 
                             prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
                           )
                         }}
                         className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                           selectedParticipants.includes(m.id)
                             ? `${m.color.replace('bg-', 'bg-opacity-10 ')} border-blue-500 ring-2 ring-blue-500/10`
                             : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                         }`}
                       >
                         <div className={`w-8 h-8 rounded-lg ${m.color} text-white flex items-center justify-center font-bold text-xs shadow-sm`}>{m.avatar}</div>
                         <span className="text-xs font-black text-gray-700">{m.name}</span>
                       </button>
                     ))}
                   </div>
                 </div>

                 <div className="pt-4 flex gap-3">
                   <button type="submit" className="flex-1 bg-blue-600 text-white rounded-xl py-4 font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">Establish Link</button>
                   <button type="button" onClick={() => setShowNewConv(false)} className="px-6 bg-gray-100 text-gray-500 rounded-xl py-4 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-gray-200 transition-all">Cancel</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
