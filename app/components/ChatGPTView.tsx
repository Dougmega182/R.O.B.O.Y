"use client";

import { useEffect, useRef, useState } from "react";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const SYSTEM_PROMPT =
  "You are the FamilyWall household assistant. Be concise, practical, and helpful for family planning, chores, schedules, meals, and admin tasks.";

export default function ChatGPTView() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Ask anything about the household. I can help with planning, chores, meals, reminders, and quick answers.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const res = await fetch("/api/chatgpt");
        const data = await res.json();
        setConfigured(Boolean(data.configured));
      } catch {
        setConfigured(false);
      }
    };
    loadStatus();
  }, []);

  useEffect(() => {
    viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = input.trim();
    if (!prompt || sending || !configured) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: prompt }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chatgpt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...nextMessages.filter((message) => message.role !== "system"),
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Chat request failed");
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.content || "No response." }]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${error?.message || "Chat request failed."}` },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-900">Ask ChatGPT</h2>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mt-1">In-app household AI</div>
        </div>
        <div className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest ${configured ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-700"}`}>
          {configured ? "Connected" : "Needs Admin Setup"}
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div ref={viewportRef} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-gray-50/40">
          {messages.map((message, index) => (
            <div key={index} className={`max-w-[80%] rounded-3xl px-5 py-4 text-sm leading-relaxed shadow-sm ${message.role === "user" ? "self-end bg-blue-600 text-white rounded-br-md" : "self-start bg-white text-gray-800 rounded-bl-md border border-gray-100"}`}>
              {message.content}
            </div>
          ))}
          {sending && (
            <div className="self-start rounded-3xl rounded-bl-md border border-gray-100 bg-white px-5 py-4 text-sm text-gray-500 shadow-sm">
              Thinking…
            </div>
          )}
        </div>

        {!configured ? (
          <div className="border-t border-gray-100 bg-white p-6 text-sm text-gray-500">
            Open Admin and connect an OpenAI API key to enable in-app ChatGPT.
          </div>
        ) : (
          <form onSubmit={handleSend} className="border-t border-gray-100 bg-white p-4 flex items-end gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask ChatGPT about your household..."
              rows={2}
              className="flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="rounded-2xl bg-slate-900 px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-black disabled:opacity-50"
            >
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
