"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import FamilyFeed from "@/components/FamilyFeed";
import DetailDrawer from "@/components/DetailDrawer";
import ChoreBoard from "@/components/ChoreBoard";
import WeatherWidget from "@/components/WeatherWidget";
import CalendarView from "@/components/CalendarView";
import SettingsView from "@/components/SettingsView";
import SpotifySidebar from "@/components/SpotifySidebar";
import SpotifyView from "@/components/SpotifyView";
import ListView from "@/components/ListView";
import MealPlannerView from "@/components/MealPlannerView";
import BudgetView from "@/components/BudgetView";
import TimetableView from "@/components/TimetableView";
import DocumentsView from "@/components/DocumentsView";
import GalleryView from "@/components/GalleryView";
import ContactBookView from "@/components/ContactBookView";
import OurPlacesView from "@/components/OurPlacesView";
import MessageCenterView from "@/components/MessageCenterView";
import RoutinesView from "@/components/RoutinesView";
import MemberAvatar from "@/components/MemberAvatar";
import ChatGPTView from "@/components/ChatGPTView";
import { FeedItem, FeedStatus } from "@/lib/types/feed";
import { Member, getHouseholdMembers } from "@/lib/members";
import { createClient } from "@/lib/supabase/client";

type UIStatus = "idle" | "saving" | "error";
type View = "home" | "calendar" | "tasks" | "routines" | "lists" | "meals" | "budget" | "timetable" | "documents" | "gallery" | "contacts" | "places" | "messages" | "spotify" | "chatgpt" | "settings";
type HomeCardItem = {
  title: string;
  meta: string;
  color: string;
  details?: string[];
  link?: string;
  billId?: string;
  billStatus?: "outstanding" | "paid";
};
type HomeOverview = {
  meals: HomeCardItem[];
  timetable: HomeCardItem[];
  calendar: HomeCardItem[];
  chores: HomeCardItem[];
  lists: HomeCardItem[];
  bills: HomeCardItem[];
};

const EMPTY_HOME_OVERVIEW: HomeOverview = {
  meals: [],
  timetable: [],
  calendar: [],
  chores: [],
  lists: [],
  bills: [],
};

function formatDateLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatCalendarLabel(start: string) {
  const date = new Date(start);
  return date.toLocaleString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [activeView, setActiveView] = useState<View>("home");
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [selected, setSelected] = useState<FeedItem | null>(null);
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "error">("synced");
  const [uiStatusMap, setUiStatusMap] = useState<Record<string, UIStatus>>({});
  const [adminPin, setAdminPin] = useState("1234");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const sidebarTimer = useRef<any>(null);
  const [showScreensaver, setShowScreensaver] = useState(false);
  const [screensaverPhotos, setScreensaverPhotos] = useState<any[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [targetConvId, setTargetConvId] = useState<string | null>(null);
  const [homeOverview, setHomeOverview] = useState<HomeOverview>(EMPTY_HOME_OVERVIEW);
  const [selectedOverviewItem, setSelectedOverviewItem] = useState<(HomeCardItem & { section: string }) | null>(null);

  const refreshMembers = async () => {
    const m = await getHouseholdMembers();
    setMembers(m);
    if (!currentMember && m.length > 0) setCurrentMember(m[0]);
  };

  const refreshFeed = async () => {
    setSyncStatus("syncing");
    try {
      const res = await fetch("/api/feed");
      const data = await res.json();
      setFeed(Array.isArray(data?.items) ? data.items : []);
      setSyncStatus("synced");
    } catch (err) {
      setSyncStatus("error");
    }
  };

  const refreshHomeOverview = async () => {
    try {
      const today = new Date();
      const todayIso = today.toISOString().split("T")[0];
      const timetableDay = (today.getDay() + 6) % 7;

      const [mealsRes, timetableRes, calendarRes, choresRes, listsRes, billsRes] = await Promise.all([
        fetch("/api/meals"),
        fetch("/api/timetable"),
        fetch("/api/calendar"),
        fetch("/api/chores"),
        fetch("/api/lists"),
        fetch("/api/bills"),
      ]);

      const mealsData = mealsRes.ok ? await mealsRes.json() : [];
      const timetableData = timetableRes.ok ? await timetableRes.json() : [];
      const calendarData = calendarRes.ok ? await calendarRes.json() : { events: [] };
      const choresData = choresRes.ok ? await choresRes.json() : [];
      const listsData = listsRes.ok ? await listsRes.json() : [];
      const billsData = billsRes.ok ? await billsRes.json() : { bills: [] };

      const meals = (Array.isArray(mealsData) ? mealsData : [])
        .filter((meal: any) => meal.date >= todayIso)
        .slice(0, 3)
        .map((meal: any) => ({
          title: meal.name || meal.recipes?.name || `Planned ${meal.meal_type}`,
          meta: `${formatDateLabel(meal.date)} · ${meal.meal_type}`,
          color: "bg-amber-500",
          details: [
            `Date: ${formatDateLabel(meal.date)}`,
            `Meal: ${meal.meal_type}`,
            meal.recipe_url ? `Recipe: ${meal.recipe_url}` : "",
            meal.notes ? `Notes: ${meal.notes}` : "",
          ].filter(Boolean),
        }));

      const timetable = (Array.isArray(timetableData) ? timetableData : [])
        .filter((entry: any) => entry.day_of_week === timetableDay)
        .slice(0, 3)
        .map((entry: any) => {
          const member = members.find((m) => m.id === entry.member_id);
          return {
            title: entry.title,
            meta: `${entry.start_time} - ${entry.end_time}${member ? ` · ${member.name}` : ""}`,
            color: "bg-blue-500",
            details: [
              `Time: ${entry.start_time} - ${entry.end_time}`,
              member ? `Family member: ${member.name}` : "",
              entry.is_alternating ? `Repeats: alternating weeks` : `Repeats: ${entry.week_pattern || "every week"}`,
            ].filter(Boolean),
          };
        });

      const calendar = (Array.isArray(calendarData?.events) ? calendarData.events : [])
        .slice(0, 3)
        .map((event: any) => ({
          title: event.title || "Calendar event",
          meta: formatCalendarLabel(event.start),
          color: "bg-emerald-500",
          details: [
            `Starts: ${formatCalendarLabel(event.start)}`,
            event.end ? `Ends: ${formatCalendarLabel(event.end)}` : "",
            event.location ? `Location: ${event.location}` : "",
          ].filter(Boolean),
          link: event.link,
        }));

      const chores = (Array.isArray(choresData) ? choresData : [])
        .slice(0, 3)
        .map((chore: any) => {
          const member = members.find((m) => m.id === chore.assigned_to);
          return {
            title: chore.name,
            meta: `${member ? member.name : "Unassigned"} · completed ${chore.count || 0} times`,
            color: "bg-fuchsia-500",
            details: [
              `Assigned to: ${member ? member.name : "Unassigned"}`,
              `Reward: $${Number(chore.reward || 0).toFixed(2)}`,
              `Times completed: ${chore.count || 0}`,
            ],
          };
        });

      const activityLists = (Array.isArray(listsData) ? listsData : []).filter((list: any) => list.show_in_activity);
      const listCardsRaw = await Promise.all(
        activityLists.slice(0, 3).map(async (list: any) => {
          try {
            const res = await fetch(`/api/lists/${list.id}/items`);
            const items = res.ok ? await res.json() : [];
            const pending = (Array.isArray(items) ? items : []).filter((item: any) => !item.completed);
            return {
              title: `${list.icon} ${list.name}`,
              meta: `${pending.length} pending item${pending.length === 1 ? "" : "s"}`,
              color: "bg-rose-500",
              details: pending.slice(0, 6).map((item: any) => item.content),
            };
          } catch {
            return null;
          }
        })
      );
      const lists = listCardsRaw.filter(Boolean) as HomeCardItem[];
      const bills = (Array.isArray(billsData?.bills) ? billsData.bills : [])
        .slice(0, 4)
        .map((bill: any) => ({
          title: bill.name,
          meta: `$${Number(bill.amount).toFixed(2)} · due ${formatDateLabel(bill.dueDate)}`,
          color: bill.status === "outstanding" ? "bg-emerald-500" : "bg-red-500",
          details: [
            `Amount: $${Number(bill.amount).toFixed(2)}`,
            `Due date: ${formatDateLabel(bill.dueDate)}`,
            `Status: ${bill.status === "outstanding" ? "Outstanding" : "Paid"}`,
            bill.paidAt ? `Paid at: ${new Date(bill.paidAt).toLocaleString("en-AU")}` : "",
          ].filter(Boolean),
          billId: bill.id,
          billStatus: bill.status,
        }));

      setHomeOverview({ meals, timetable, calendar, chores, lists, bills });
    } catch (err) {
      console.error("Home overview error:", err);
      setHomeOverview(EMPTY_HOME_OVERVIEW);
    }
  };

  useEffect(() => {
    setMounted(true);
    refreshMembers();
    refreshFeed();
    const interval = setInterval(() => {
      refreshFeed();
      refreshHomeOverview();
    }, 30000);

    const fetchPin = async () => {
      const res = await fetch("/api/settings/pin");
      if (res.ok) {
        const data = await res.json();
        setAdminPin(data.pin);
      }
    };
    fetchPin();

    // 🛡️ Global View Switcher
    const handleSwitch = (e: any) => {
      if (e.detail) setActiveView(e.detail as View);
    };
    window.addEventListener('switch-view', handleSwitch);

    // 🛡️ Handle View Parameter (e.g. for redirects)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const view = params.get("view") as View;
      if (view && ["home", "calendar", "tasks", "routines", "lists", "meals", "budget", "timetable", "documents", "gallery", "contacts", "places", "messages", "spotify", "chatgpt", "settings"].includes(view)) {
        setActiveView(view);
        if (view === "settings") setAdminUnlocked(true); // Auto-unlock for redirects if needed
      }
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('switch-view', handleSwitch);
    };
  }, []);

  useEffect(() => {
    if (members.length > 0) {
      refreshHomeOverview();
    }
  }, [members.length]);

  useEffect(() => {
    if (showScreensaver) {
      const fetchPhotos = async () => {
        try {
          const localRes = await fetch("/api/gallery/photos");
          const localData = await localRes.json();
          if (Array.isArray(localData) && localData.length > 0) {
            setScreensaverPhotos(localData);
          } else {
            const res = await fetch("/api/gallery/google");
            const data = await res.json();
            if (data.photos?.length > 0) setScreensaverPhotos(data.photos);
          }
        } catch (err) {
          console.error("Screensaver fetch error:", err);
        }
      };
      fetchPhotos();
    }
  }, [showScreensaver]);

  useEffect(() => {
    let interval: any;
    if (showScreensaver && screensaverPhotos.length > 0) {
      interval = setInterval(() => {
        const nextIndex = (currentPhotoIndex + 1) % screensaverPhotos.length;
        // Preload next
        const img = new Image();
        img.src = screensaverPhotos[nextIndex].url;
        
        setCurrentPhotoIndex(prev => (prev + 1) % screensaverPhotos.length);
      }, 15000);
    }
    return () => clearInterval(interval);
  }, [showScreensaver, screensaverPhotos, currentPhotoIndex]);

  const handleUpdateStatus = async (id: string, newStatus: FeedStatus) => {
    if (!currentMember) return;
    const previousFeed = [...feed];
    setUiStatusMap(prev => ({ ...prev, [id]: "saving" }));
    setFeed((prev) => prev.map((item) => item.id === id ? { ...item, status: newStatus, updatedAt: new Date().toISOString() } : item));
    setSelected(null);

    try {
      const res = await fetch(`/api/feed/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, actorId: currentMember.id }),
      });
      if (!res.ok) throw new Error("Mutation rejected");
      setUiStatusMap(prev => ({ ...prev, [id]: "idle" }));
      await refreshFeed();
    } catch (err: any) {
      setUiStatusMap(prev => ({ ...prev, [id]: "error" }));
      setTimeout(() => {
        setFeed(previousFeed);
        setUiStatusMap(prev => ({ ...prev, [id]: "idle" }));
      }, 1000);
    }
  };

  const handleSelectItem = (item: FeedItem) => {
    if (item.type === 'message') {
      // If it's a message update, jump to messages view and set the target conversation
      setTargetConvId(item.id.replace('msg_', '')); // Assuming ID mapping or metadata
      setActiveView("messages");
    } else if (item.type === 'task') {
      setActiveView("tasks");
    } else {
      setSelected(item);
    }
  };

  const handleSidebarExpand = () => {
    setSidebarExpanded(true);
    if (sidebarTimer.current) clearTimeout(sidebarTimer.current);
    sidebarTimer.current = setTimeout(() => {
      if (!isHovered) setSidebarExpanded(false);
    }, 5000);
  };

  const effectiveExpanded = sidebarExpanded || isHovered;

  const handleMarkBillPaid = async () => {
    if (!selectedOverviewItem?.billId) return;
    await fetch("/api/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_paid", id: selectedOverviewItem.billId }),
    });
    setSelectedOverviewItem(null);
    await refreshHomeOverview();
  };

  if (!mounted || !currentMember) return (
    <div className="h-screen flex items-center justify-center bg-[#f8f9fa]">
      <div className="flex flex-col items-center gap-6">
        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[12px] font-black text-blue-600 uppercase tracking-[0.4em]">R.O.B.O.Y</span>
          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">Run Our Base, Own Your Year</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-[#f8f9fa] text-gray-800 font-sans overflow-hidden relative">
      
      <DetailDrawer 
        item={selected} 
        currentUser={currentMember as any}
        onClose={() => setSelected(null)} 
        onUpdateStatus={handleUpdateStatus}
      />

      {selectedOverviewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px] p-6" onClick={() => setSelectedOverviewItem(null)}>
          <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl border border-gray-100 p-8 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">{selectedOverviewItem.section}</div>
                <h3 className="text-2xl font-black text-gray-900 leading-tight">{selectedOverviewItem.title}</h3>
                <p className="text-sm text-gray-500 mt-2">{selectedOverviewItem.meta}</p>
              </div>
              <button onClick={() => setSelectedOverviewItem(null)} className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
                ×
              </button>
            </div>

            <div className={`w-full h-2 rounded-full ${selectedOverviewItem.color} mb-6`} />

            <div className="space-y-3">
              {(selectedOverviewItem.details || []).map((detail, index) => (
                <div key={index} className="text-sm text-gray-700 bg-gray-50 rounded-2xl px-4 py-3">
                  {detail}
                </div>
              ))}
            </div>

            {selectedOverviewItem.billId && selectedOverviewItem.billStatus === "outstanding" && (
              <button
                onClick={handleMarkBillPaid}
                className="mt-6 inline-flex items-center justify-center px-5 py-3 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all"
              >
                Mark As Paid
              </button>
            )}

            {selectedOverviewItem.link && (
              <a
                href={selectedOverviewItem.link}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center justify-center px-5 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all"
              >
                Open Source Event
              </a>
            )}
          </div>
        </div>
      )}

      <nav 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          if (!sidebarExpanded) setSidebarExpanded(false);
        }}
        className={`bg-white border-r border-gray-100 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out z-50 print:hidden ${
          effectiveExpanded ? 'w-64 shadow-2xl' : 'w-20'
        }`}
      >
        <div className="flex items-center gap-4 p-5 border-b border-gray-100 overflow-hidden">
          <button 
            onClick={handleSidebarExpand}
            className={`flex-shrink-0 w-10 h-10 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm transition-all hover:bg-blue-600 hover:text-white ${!effectiveExpanded ? 'mx-auto' : ''}`}
          >
            {effectiveExpanded ? (
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            ) : "R"}
          </button>
          {effectiveExpanded && (
            <div className="animate-in fade-in slide-in-from-left-2 duration-300">
              <div className="text-sm font-black text-gray-800 tracking-tight">R.O.B.O.Y</div>
              <div className="text-[10px] text-gray-400 font-medium whitespace-nowrap">{members.length} family members</div>
            </div>
          )}
        </div>

        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto overflow-x-hidden">
          {[
            { id: "home" as View, label: "Activity", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg> },
            { id: "calendar" as View, label: "Calendar", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> },
            { id: "lists" as View, label: "Lists", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg> },
            { id: "budget" as View, label: "Rewards", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> },
            { id: "documents" as View, label: "Documents", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg> },
            { id: "timetable" as View, label: "Timetable", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="3" x2="9" y2="21"></line></svg> },
            { id: "meals" as View, label: "Meals", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path></svg> },
            { id: "tasks" as View, label: "Chores", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> },
            { id: "routines" as View, label: "Routines", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> },
            { id: "messages" as View, label: "Chat", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg> },
            { id: "chatgpt" as View, label: "Ask AI", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l7 4v10l-7 4-7-4V7l7-4z"></path><path d="M9 12h6"></path><path d="M12 9v6"></path></svg> },
            { id: "contacts" as View, label: "Contacts", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> },
            { id: "places" as View, label: "Places", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> },
            { id: "gallery" as View, label: "Photos", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => { setActiveView(item.id); if (!isHovered) setSidebarExpanded(false); }}
              className={`w-full flex items-center rounded-2xl transition-all h-12 ${effectiveExpanded ? 'px-4 gap-4' : 'justify-center'} ${activeView === item.id ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}
              title={item.label}
            >
              <div className="flex-shrink-0">{item.icon}</div>
              {effectiveExpanded && <span className="text-sm font-bold tracking-tight">{item.label}</span>}
            </button>
          ))}
        </div>

        <div className="border-t border-gray-100 p-3 space-y-1">
          <button onClick={() => setActiveView("spotify")} className={`w-full flex items-center rounded-2xl transition-all h-12 ${effectiveExpanded ? 'px-4 gap-4' : 'justify-center'} ${activeView === 'spotify' ? 'bg-[#1DB954]/10 text-[#1DB954]' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.494 17.306c-.215.353-.679.467-1.032.252-2.855-1.744-6.45-2.138-10.684-1.17-.404.092-.808-.162-.9-.566-.092-.403.161-.808.566-.9 4.636-1.06 8.598-.606 11.798 1.348.353.215.467.679.252 1.036zm1.466-3.26c-.271.442-.847.584-1.288.314-3.266-2.008-8.246-2.593-12.11-1.419-.497.151-1.02-.132-1.171-.629-.151-.497.132-1.02.629-1.171 4.417-1.341 9.902-.686 13.636 1.606.442.271.584.847.314 1.288zm.13-3.419c-3.917-2.326-10.37-2.541-14.13-1.4c-.6.181-1.237-.162-1.419-.763-.181-.601.162-1.237.763-1.419 4.316-1.31 11.434-1.049 15.952 1.631.54.32.716 1.015.396 1.554-.32.539-1.015.715-1.554.396z"/></svg>
            {effectiveExpanded && <span className="text-sm font-bold tracking-tight">Audio</span>}
          </button>
          <button onClick={() => setActiveView("settings")} className={`w-full flex items-center rounded-2xl transition-all h-12 ${effectiveExpanded ? 'px-4 gap-4' : 'justify-center'} ${activeView === 'settings' ? 'bg-amber-50 text-amber-600' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            {effectiveExpanded && <span className="text-sm font-bold tracking-tight">Admin</span>}
          </button>
        </div>

        <div className={`mt-auto p-4 border-t border-gray-100 flex items-center transition-all ${effectiveExpanded ? 'gap-3' : 'justify-center'}`}>
          <MemberAvatar avatar={currentMember.avatar} color={currentMember.color} className="flex-shrink-0 w-10 h-10 rounded-2xl shadow-sm" textClassName="text-xs font-bold" alt={currentMember.name} />
          {effectiveExpanded && <div className="min-w-0 flex-1"><div className="text-xs font-black text-gray-800 truncate">{currentMember.name}</div><div className="text-[9px] font-bold text-gray-400 truncate uppercase tracking-tighter">{currentMember.role}</div></div>}
        </div>
      </nav>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 shrink-0 relative print:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveView("chatgpt")}
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-black"
            >
              Ask ChatGPT
            </button>
          </div>
          <div className="flex flex-col items-center absolute left-1/2 -translate-x-1/2">
            <div className="text-[16px] font-black text-blue-600 uppercase tracking-[0.4em] leading-none">R.O.B.O.Y</div>
            <div className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">Run Our Base, Own Your Year</div>
          </div>
          <div className="flex items-center gap-3">
            <WeatherWidget />
            <button onClick={() => window.location.reload()} className="p-2 text-gray-300 hover:text-blue-500 rounded-lg"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg></button>
            <button onClick={() => setShowScreensaver(true)} className="p-2 text-gray-300 hover:text-emerald-500 rounded-lg"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative print:p-0 print:overflow-visible">
          {/* Persistent Audio Node (Always mounted to prevent music stopping) */}
          <div className={activeView === "spotify" ? "h-full" : "hidden"}>
            <SpotifyView />
          </div>

          {activeView === "home" && (
             <div className="w-full grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 h-full">
                <div className="flex flex-col gap-6">
                   <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Today And Next</h2>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {[
                       { title: "Upcoming Meals", items: homeOverview.meals },
                       { title: "Today's Timetable", items: homeOverview.timetable },
                       { title: "Calendar Events", items: homeOverview.calendar },
                       { title: "Chores", items: homeOverview.chores },
                       { title: "Lists To Watch", items: homeOverview.lists },
                       { title: "Bills To Pay", items: homeOverview.bills },
                     ].map((section) => (
                       <div key={section.title} className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
                         <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{section.title}</div>
                         {section.items.length > 0 ? (
                           <div className="space-y-3">
                             {section.items.map((item, index) => (
                               <button
                                 key={`${section.title}-${index}`}
                                 onClick={() => setSelectedOverviewItem({ ...item, section: section.title })}
                                 className="w-full text-left pb-3 border-b border-gray-50 last:border-b-0 last:pb-0 hover:bg-gray-50 rounded-2xl px-3 py-2 -mx-3 transition-all"
                               >
                                 <div className="flex items-start gap-3">
                                   <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${item.color}`} />
                                   <div className="min-w-0">
                                     <div className="text-sm font-bold text-gray-800">{item.title}</div>
                                     <div className="text-[10px] text-gray-400 font-medium mt-1">{item.meta}</div>
                                   </div>
                                 </div>
                               </button>
                             ))}
                           </div>
                         ) : (
                           <div className="text-xs text-gray-300 italic">Nothing scheduled here yet.</div>
                         )}
                       </div>
                     ))}
                   </div>
                   <div className="flex items-center justify-between">
                     <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Recent Activity</h3>
                     <div className="text-[10px] text-gray-300 font-medium">
                       {feed.length > 0 ? `${feed.length} updates` : "No recent updates"}
                     </div>
                   </div>
                   <FamilyFeed items={feed} onSelect={handleSelectItem} />
                </div>
                <div className="hidden lg:flex flex-col gap-6 sticky top-0">
                   <SpotifySidebar />
                   <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">House Status</h3>
                      <div className="space-y-4">
                         <div className="flex items-center justify-between"><span className="text-[10px] font-bold text-gray-500 uppercase">Family Members</span><span className="text-[10px] font-black text-blue-600">{members.length}</span></div>
                         <div className="flex items-center justify-between"><span className="text-[10px] font-bold text-gray-500 uppercase">Feed Items</span><span className="text-[10px] font-black text-emerald-600">{feed.length}</span></div>
                      </div>
                   </div>
                </div>
             </div>
          )}
          
          {activeView === "calendar" && <CalendarView members={members} />}
          {activeView === "messages" && <MessageCenterView members={members} initialConvId={targetConvId || undefined} />}
          {activeView === "chatgpt" && <ChatGPTView />}
          {activeView === "tasks" && (
            <div className="flex flex-col gap-8 h-full">
               <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Relational Chore Matrix</h2>
               <ChoreBoard members={members} />
            </div>
          )}
          
          {activeView === "lists" && <div className="w-full h-[calc(100vh-10rem)]"><ListView /></div>}
          {activeView === "meals" && <MealPlannerView />}
          {activeView === "budget" && <BudgetView members={members} />}
          {activeView === "timetable" && <TimetableView members={members} />}
          {activeView === "documents" && <DocumentsView />}
          {activeView === "gallery" && <GalleryView members={members} />}
          {activeView === "contacts" && <ContactBookView />}
          {activeView === "places" && <OurPlacesView />}
          {activeView === "routines" && <RoutinesView members={members} />}
          {activeView === "settings" && (
            <div className="w-full">
              {!adminUnlocked ? (
                 <div className="flex items-center justify-center py-24">
                   <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl p-12 w-full max-w-sm text-center">
                     <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></div>
                     <h2 className="text-xl font-black text-gray-800 mb-1">Access Required</h2>
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-8">Enter System PIN</p>
                     <div className="flex justify-center gap-3 mb-8">
                       {[0,1,2,3].map(i => (
                         <div key={i} className={`w-12 h-16 rounded-2xl border-2 flex items-center justify-center text-2xl transition-all ${pinInput.length > i ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-100 bg-gray-50'}`}>
                           {pinInput[i] ? '●' : ''}
                         </div>
                       ))}
                     </div>
                     <div className="grid grid-cols-3 gap-3">
                       {[1,2,3,4,5,6,7,8,9,0,'⌫'].map((num, i) => (
                         <button key={i} onClick={() => {
                           if (num === '⌫') { setPinInput(prev => prev.slice(0,-1)); return; }
                           const next = pinInput + num;
                           if (next.length <= 4) {
                             setPinInput(next);
                             if (next === adminPin) { setAdminUnlocked(true); setPinInput(''); }
                             else if (next.length === 4) { setPinError(true); setTimeout(() => { setPinInput(''); setPinError(false); }, 1000); }
                           }
                         }} className={`h-14 rounded-2xl bg-gray-50 text-gray-800 font-bold hover:bg-gray-100 transition-all ${num === 0 ? 'col-start-2' : ''}`}>
                           {num}
                         </button>
                       ))}
                     </div>
                   </div>
                 </div>
              ) : (
                <div className="flex flex-col gap-8">
                  <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100">
                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">System Overrides</h2>
                    <button onClick={() => setAdminUnlocked(false)} className="text-[10px] font-black text-red-500 uppercase tracking-widest">Seal Node</button>
                  </div>
                  <SettingsView onMembersChange={refreshMembers} />
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {showScreensaver && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center cursor-none animate-in fade-in duration-1000" onClick={() => setShowScreensaver(false)}>
          <div className="absolute inset-0 overflow-hidden">
             {screensaverPhotos.length > 0 ? (
               <img key={screensaverPhotos[currentPhotoIndex]?.id} src={screensaverPhotos[currentPhotoIndex]?.url} className="w-full h-full object-cover transition-all duration-[3000ms] scale-110 animate-in fade-in" alt="" />
             ) : (
               <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-indigo-900" />
             )}
             <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
          </div>
          <div className="relative text-center space-y-8">
            <div className="text-[12rem] font-black text-white/90 leading-none tabular-nums drop-shadow-2xl">{new Date().toLocaleTimeString("en-AU", { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
            <div className="text-3xl font-black text-white/40 uppercase tracking-[0.5em]">{new Date().toLocaleDateString("en-AU", { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            <div className="pt-12"><div className="text-[14px] font-black text-blue-500 uppercase tracking-[0.6em] mb-2">R.O.B.O.Y</div><div className="text-[8px] font-black text-white/40 uppercase tracking-[0.4em] mb-4">Run Our Base, Own Your Year</div></div>
          </div>
        </div>
      )}
    </div>
  );
}
