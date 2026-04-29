"use client";

import { useEffect, useState, useMemo } from "react";
import { Member } from "@/lib/members";

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  location?: string;
  link?: string;
  color?: string;
};

type ViewMode = "day" | "week" | "month";

const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const EVENT_COLORS = [
  "bg-red-500", "bg-blue-500", "bg-emerald-500", "bg-purple-500", 
  "bg-amber-500", "bg-pink-500", "bg-cyan-500", "bg-orange-500",
  "bg-indigo-500", "bg-lime-500"
];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getISOWeek(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getMonthGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];
  
  // Monday-based week: getDay() returns 0=Sun, so Mon=1
  let startPad = firstDay.getDay() - 1;
  if (startPad < 0) startPad = 6; // Sunday wraps
  
  for (let i = startPad; i > 0; i--) {
    days.push(new Date(year, month, 1 - i));
  }
  
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  
  // Fill to complete rows of 7
  while (days.length % 7 !== 0) {
    days.push(new Date(year, month + 1, days.length - lastDay.getDate() - startPad + 1));
  }
  
  return days;
}

function getWeekDays(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  d.setDate(d.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const nd = new Date(d);
    nd.setDate(nd.getDate() + i);
    return nd;
  });
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "pm" : "am";
  const hour = h % 12 || 12;
  return m > 0 ? `${hour}:${m.toString().padStart(2, "0")}${ampm}` : `${hour}${ampm}`;
}

function getEventColor(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
  return EVENT_COLORS[Math.abs(hash) % EVENT_COLORS.length];
}

export default function CalendarView({ members }: { members: Member[] }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    async function loadCalendars() {
      try {
        const res = await fetch("/api/calendar/list");
        const data = await res.json();
        if (res.status === 401) {
          setError("AUTH_REQUIRED");
          return;
        }
        if (data.calendars) {
          setCalendars(data.calendars);
          const saved = localStorage.getItem("selected_calendar_id");
          const savedCalendar = data.calendars.find((cal: any) => cal.id === saved);
          if (savedCalendar) {
            setSelectedCalendar(savedCalendar.id);
          } else if (data.calendars[0]?.id) {
            setSelectedCalendar(data.calendars[0].id);
            localStorage.setItem("selected_calendar_id", data.calendars[0].id);
          }
        }
      } catch (err: any) { 
        console.error("Calendar list error:", err); 
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadCalendars();
  }, []);

  useEffect(() => {
    if (!selectedCalendar) return;

    async function loadCalendar() {
      setLoading(true);
      try {
        const res = await fetch(`/api/calendar?calendarId=${encodeURIComponent(selectedCalendar)}`);
        const data = await res.json();
        if (res.status === 401) setError("AUTH_REQUIRED");
        else if (!res.ok) throw new Error(data.error || "Failed");
        else { setEvents(data.events || []); setError(null); }
      } catch (err: any) { setError(err.message); }
      finally { setLoading(false); }
    }
    loadCalendar();
  }, [selectedCalendar]);

  const navigate = (dir: -1 | 1) => {
    const d = new Date(currentDate);
    if (view === "day") d.setDate(d.getDate() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  const eventsForDay = (day: Date) =>
    events.filter((e) => isSameDay(new Date(e.start), day));

  const monthDays = useMemo(
    () => getMonthGrid(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate]
  );

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  // Mini calendar for sidebar
  const miniMonthDays = useMemo(
    () => getMonthGrid(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate]
  );

  const headerLabel = useMemo(() => {
    if (view === "day") return currentDate.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    if (view === "week") {
      const days = getWeekDays(currentDate);
      return `${days[0].toLocaleDateString("en-AU", { day: "numeric", month: "short" })} — ${days[6].toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }, [currentDate, view]);

  if (error === "AUTH_REQUIRED") return (
    <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div className="text-4xl mb-4">🔑</div>
      <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest">Google Login Required</h2>
      <p className="text-xs text-gray-400 mt-2 mb-6">Connect your Google account to sync.</p>
      <button onClick={() => window.location.href = '/login'} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25">
        Sign in with Google
      </button>
    </div>
  );

  // ── Event Chip (compact, colored) ──
  const EventChip = ({ event }: { event: CalendarEvent }) => {
    const color = event.color || getEventColor(event.title);
    return (
      <div className={`${color} text-white text-[10px] font-semibold px-1.5 py-0.5 rounded truncate cursor-pointer hover:brightness-110 transition-all leading-tight`}>
        <span className="font-bold">{formatTime(event.start)}</span>{" "}
        <span className="opacity-90">{event.title}</span>
      </div>
    );
  };

  // ── Day View ──
  const DayView = () => {
    const dayEvents = eventsForDay(currentDate);
    const hours = Array.from({ length: 18 }, (_, i) => i + 5);
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {hours.map((h) => {
          const hourEvts = dayEvents.filter(e => new Date(e.start).getHours() === h);
          return (
            <div key={h} className="flex border-b border-gray-100 min-h-[48px] hover:bg-blue-50/30 transition-colors">
              <div className="w-16 flex-shrink-0 p-2 text-right border-r border-gray-100">
                <span className="text-[10px] font-medium text-gray-400">{h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h-12} PM`}</span>
              </div>
              <div className="flex-1 p-1 flex flex-col gap-0.5">
                {hourEvts.map(e => <EventChip key={e.id} event={e} />)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── Week View ──
  const WeekView = () => {
    const today = new Date();
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-[40px_repeat(7,1fr)] border-b border-gray-200">
          <div className="p-2 text-center text-[10px] font-bold text-gray-300 border-r border-gray-100">W{getISOWeek(weekDays[0])}</div>
          {weekDays.map((d, i) => (
            <div key={i} className={`p-2 text-center border-r border-gray-100 last:border-r-0 ${isSameDay(d, today) ? 'bg-blue-50' : ''}`}>
              <div className="text-[10px] font-bold text-gray-400 uppercase">{DAYS_SHORT[i]}</div>
              <div className={`text-lg font-black mt-0.5 ${isSameDay(d, today) ? 'w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto' : 'text-gray-800'}`}>{d.getDate()}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[40px_repeat(7,1fr)] min-h-[400px]">
          <div className="border-r border-gray-100" />
          {weekDays.map((d, i) => {
            const evts = eventsForDay(d);
            return (
              <div key={i} className={`p-1 border-r border-gray-100 last:border-r-0 flex flex-col gap-0.5 ${isSameDay(d, today) ? 'bg-blue-50/30' : ''}`}>
                {evts.map(e => <EventChip key={e.id} event={e} />)}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Month View (Google Calendar style) ──
  const MonthView = () => {
    const today = new Date();
    const weeks: Date[][] = [];
    for (let i = 0; i < monthDays.length; i += 7) {
      weeks.push(monthDays.slice(i, i + 7));
    }

    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Day header row */}
        <div className="grid grid-cols-[40px_repeat(7,1fr)] border-b border-gray-200 bg-gray-50/50">
          <div className="p-2" />
          {DAYS_SHORT.map(d => (
            <div key={d} className="p-2 text-center border-l border-gray-100">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{d}</span>
            </div>
          ))}
        </div>
        {/* Week rows */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-[40px_repeat(7,1fr)] border-b border-gray-100 last:border-b-0">
            {/* Week number */}
            <div className="p-1.5 flex items-start justify-center border-r border-gray-100">
              <span className="text-[10px] font-bold text-gray-300">W{getISOWeek(week[0])}</span>
            </div>
            {/* Day cells */}
            {week.map((day, di) => {
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isToday = isSameDay(day, today);
              const dayEvts = eventsForDay(day);
              return (
                <div
                  key={di}
                  className={`min-h-[100px] p-1 border-l border-gray-100 transition-colors hover:bg-blue-50/20 ${
                    !isCurrentMonth ? "bg-gray-50/50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5 px-0.5">
                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday
                        ? "bg-blue-600 text-white"
                        : isCurrentMonth
                        ? "text-gray-700"
                        : "text-gray-300"
                    }`}>
                      {day.getDate()}
                    </span>
                  </div>
                  <div className="flex flex-col gap-[2px]">
                    {dayEvts.slice(0, 4).map(e => <EventChip key={e.id} event={e} />)}
                    {dayEvts.length > 4 && (
                      <div className="text-[9px] font-bold text-gray-400 px-1 cursor-pointer hover:text-blue-500">+{dayEvts.length - 4} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Main Calendar */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={goToday} className="px-4 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all active:scale-95">
              Today
            </button>
            <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <button onClick={() => navigate(1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
            <h2 className="text-xl font-bold text-gray-800 ml-2">{headerLabel}</h2>
          </div>
          
          <div className="flex items-center gap-3">
            {calendars.length > 0 && (
              <select 
                value={selectedCalendar}
                onChange={(e) => { setSelectedCalendar(e.target.value); localStorage.setItem("selected_calendar_id", e.target.value); }}
                className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                {calendars.map((cal: any) => (
                  <option key={cal.id} value={cal.id}>{cal.summary}</option>
                ))}
              </select>
            )}
            <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-200">
              {(["day", "week", "month"] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all capitalize ${
                    view === v ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar Body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center bg-white rounded-lg border border-gray-200 animate-pulse">
            <div className="text-center">
              <div className="text-3xl mb-3 opacity-30">📅</div>
              <div className="text-xs font-medium text-gray-300">Syncing with Google...</div>
            </div>
          </div>
        ) : (
          <>
            {view === "day" && <DayView />}
            {view === "week" && <WeekView />}
            {view === "month" && <MonthView />}
          </>
        )}
      </div>

      {/* Right Sidebar — Mini Calendar + Calendar List */}
      <div className="hidden xl:flex flex-col gap-6 w-56 flex-shrink-0">
        {/* Mini Month Calendar */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-700">{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
            <div className="flex gap-1">
              <button onClick={() => navigate(-1)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <button onClick={() => navigate(1)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-0">
            {["M","T","W","T","F","S","S"].map((d, i) => (
              <div key={i} className="text-center text-[9px] font-bold text-gray-400 py-1">{d}</div>
            ))}
            {miniMonthDays.map((day, i) => {
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isToday = isSameDay(day, new Date());
              const hasEvents = eventsForDay(day).length > 0;
              return (
                <button
                  key={i}
                  onClick={() => { setCurrentDate(day); setView("day"); }}
                  className={`w-7 h-7 flex items-center justify-center text-[11px] font-medium rounded-full transition-all hover:bg-gray-100 ${
                    isToday ? "bg-blue-600 text-white hover:bg-blue-700" :
                    !isCurrentMonth ? "text-gray-300" :
                    "text-gray-700"
                  }`}
                >
                  {day.getDate()}
                  {hasEvents && !isToday && (
                    <span className="absolute mt-5 w-1 h-1 bg-blue-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* My Calendars */}
        {calendars.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-xs font-bold text-gray-700 mb-3">My calendars</h3>
            <div className="flex flex-col gap-2">
              {calendars.map((cal: any, i: number) => (
                <button
                  key={cal.id}
                  onClick={() => { setSelectedCalendar(cal.id); localStorage.setItem("selected_calendar_id", cal.id); }}
                  className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left transition-all hover:bg-gray-50 ${selectedCalendar === cal.id ? 'bg-gray-50' : ''}`}
                >
                  <div className={`w-3 h-3 rounded-sm ${EVENT_COLORS[i % EVENT_COLORS.length]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-700 truncate">{cal.summary}</div>
                    {cal.primary && <div className="text-[9px] text-gray-400">Default calendar</div>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
