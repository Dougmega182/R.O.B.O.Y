"use client";

import { useEffect, useState, useCallback } from "react";
import { Member } from "@/lib/members";
import MemberAvatar from "./MemberAvatar";

type Entry = {
  id: string;
  member_id: string;
  title: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  color: string;
  is_alternating: boolean;
  week_pattern: string;
};

type EntryForm = {
  id?: string;
  title: string;
  member_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  color: string;
  is_alternating: boolean;
  week_pattern: string;
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 16 * 2 }, (_, i) => {
  const totalMinutes = (6 * 60) + (i * 30);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return { h, m };
});
const HOUR_HEIGHT = 160;

const COLORS = [
  "#FF0000", // Red
  "#00AA00", // Green
  "#FF8C00", // DarkOrange
  "#0000FF", // Blue
  "#DAA520", // GoldenRod
  "#8B008B", // DarkMagenta
  "#008B8B", // DarkCyan
  "#C71585", // MediumVioletRed
];

const EMPTY_FORM: EntryForm = {
  title: "",
  member_id: "",
  day_of_week: 0,
  start_time: "09:00",
  end_time: "10:00",
  color: COLORS[0],
  is_alternating: false,
  week_pattern: "every",
};

function parseDayValue(value: string) {
  const normalized = value.trim().toLowerCase();
  if (/^\d+$/.test(normalized)) {
    const numeric = Number(normalized);
    if (numeric >= 0 && numeric <= 6) return numeric;
    if (numeric >= 1 && numeric <= 7) return numeric - 1;
  }

  const names = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const match = names.findIndex((name) => normalized.startsWith(name));
  return match >= 0 ? match : -1;
}

function csvToRows(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")));
}

export default function TimetableView({ members }: { members: Member[] }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<string>("all");
  const [showAdd, setShowAdd] = useState<{ day: number; hour: number; minute: number } | null>(null);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [form, setForm] = useState<EntryForm>(EMPTY_FORM);
  const [importMemberId, setImportMemberId] = useState("");
  const [replaceMemberSchedule, setReplaceMemberSchedule] = useState(true);
  const [importSummary, setImportSummary] = useState("");
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1); // 0-6, Mon-Sun

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedMember === "all" ? "/api/timetable" : `/api/timetable?member_id=${selectedMember}`;
      const res = await fetch(url);
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load timetable:", err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [selectedMember]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => setForm(EMPTY_FORM);

  const openAddModal = (day: number, hour: number, minute: number) => {
    setEditingEntry(null);
    const start = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const nextTotal = (hour * 60) + minute + 30;
    const end = `${String(Math.floor(nextTotal / 60)).padStart(2, "0")}:${String(nextTotal % 60).padStart(2, "0")}`;
    
    setForm({
      ...EMPTY_FORM,
      day_of_week: day,
      start_time: start,
      end_time: end,
    });
    setShowAdd({ day, hour, minute });
  };

  const openEditModal = (entry: Entry) => {
    setShowAdd(null);
    setEditingEntry(entry);
    setForm({
      id: entry.id,
      title: entry.title,
      member_id: entry.member_id,
      day_of_week: entry.day_of_week,
      start_time: entry.start_time,
      end_time: entry.end_time,
      color: entry.color,
      is_alternating: entry.is_alternating,
      week_pattern: entry.week_pattern || "every",
    });
  };

  const closeEntryModal = () => {
    setShowAdd(null);
    setEditingEntry(null);
    resetForm();
  };

  const saveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.member_id) return;

    try {
      const action = editingEntry ? "update" : undefined;
      const res = await fetch("/api/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          action,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to save timetable entry");
      }

      closeEntryModal();
      load();
    } catch (err: any) {
      console.error("Failed to save timetable entry:", err);
      alert(err?.message || "Failed to save timetable entry");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to delete timetable entry");
      }

      if (editingEntry?.id === id) {
        closeEntryModal();
      }

      load();
    } catch (err: any) {
      console.error("Failed to delete timetable entry:", err);
      alert(err?.message || "Failed to delete timetable entry");
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportSummary("");

    try {
      const text = await file.text();
      const rows = csvToRows(text);
      if (rows.length < 2) {
        throw new Error("The file needs a header row and at least one timetable row.");
      }

      const header = rows[0].map((cell) => cell.toLowerCase());
      const entriesToImport = rows.slice(1).map((row) => {
        const byName = (names: string[]) => {
          const index = header.findIndex((cell) => names.includes(cell));
          return index >= 0 ? row[index] || "" : "";
        };

        const memberName = byName(["member", "member_name", "family_member"]);
        const rowMember = members.find((member) => member.name.toLowerCase() === memberName.toLowerCase());
        const member_id = rowMember?.id || importMemberId;
        const day = parseDayValue(byName(["day", "day_of_week"]));

        return {
          member_id,
          title: byName(["title", "activity", "name"]),
          day_of_week: day,
          start_time: byName(["start", "start_time"]),
          end_time: byName(["end", "end_time"]),
          color: byName(["color"]) || COLORS[0],
          is_alternating: byName(["alternating", "is_alternating"]).toLowerCase() === "true",
          week_pattern: byName(["week_pattern"]) || "every",
        };
      });

      const invalidRows = entriesToImport.filter((entry) => !entry.title || !entry.member_id || entry.day_of_week < 0 || !entry.start_time || !entry.end_time);
      if (invalidRows.length > 0) {
        throw new Error("Some rows are missing title, day, member, start, or end time.");
      }

      const res = await fetch("/api/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import",
          entries: entriesToImport,
          clearForMemberId: replaceMemberSchedule ? importMemberId || null : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to import timetable");
      }

      setImportSummary(`${entriesToImport.length} timetable entries imported.`);
      setShowImport(false);
      load();
    } catch (err: any) {
      console.error("Timetable import failed:", err);
      alert(err?.message || "Timetable import failed");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const getEntriesForDay = (day: number) =>
    entries.filter((entry) => entry.day_of_week === day);

  const calculatePosition = (startTime: string, endTime: string) => {
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    
    const startTotal = (sh * 60) + sm;
    const endTotal = (eh * 60) + em;
    const baseTotal = 6 * 60; // Starts at 6am
    
    const top = ((startTotal - baseTotal) / 60) * HOUR_HEIGHT;
    const height = ((endTotal - startTotal) / 60) * HOUR_HEIGHT;
    
    return { top, height };
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Weekly Timetable</h2>
          <p className="text-xs text-gray-400 mt-1">Upload a CSV or manage each activity directly in the grid.</p>
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-0.5 overflow-x-auto max-w-full no-scrollbar">
            <button onClick={() => setSelectedMember("all")} className={`flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${selectedMember === "all" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}>
              Everyone
            </button>
            {members.map((member) => (
              <button key={member.id} onClick={() => setSelectedMember(member.id)} className={`flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${selectedMember === member.id ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}>
                <MemberAvatar avatar={member.avatar} color={member.color} className="w-4 h-4 rounded-full" textClassName="text-[8px] font-bold" alt={member.name} />
                {member.name}
              </button>
            ))}
          </div>
          <button onClick={() => setShowImport(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all w-full md:w-auto">
            Upload Timetable
          </button>
        </div>
      </div>

      {/* Mobile Day Picker */}
      <div className="md:hidden flex bg-white border border-gray-100 rounded-2xl p-1 gap-1">
        {DAYS.map((day, idx) => (
          <button
            key={day}
            onClick={() => setSelectedDay(idx)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-tighter transition-all ${selectedDay === idx ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            {day}
          </button>
        ))}
      </div>

      {importSummary ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
          {importSummary}
        </div>
      ) : null}

      <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-auto relative">
        <table className="w-full border-collapse table-fixed">
          <thead className="sticky top-0 z-30 bg-white">
            <tr>
              <th className="w-16 md:w-20 p-2 border-b border-r border-gray-100 bg-gray-50/50" />
              {DAYS.map((day, idx) => (
                <th key={day} className={`p-2 border-b border-r border-gray-100 last:border-r-0 bg-gray-50/50 text-center ${selectedDay === idx ? '' : 'hidden md:table-cell'}`}>
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{day}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-0 border-r border-gray-100 bg-gray-50/10">
                {HOURS.map((slot) => (
                  <div key={`${slot.h}:${slot.m}`} style={{ height: HOUR_HEIGHT / 2 }} className="border-b border-gray-100 p-2 text-right">
                    <span className="text-[10px] font-bold text-gray-400">
                      {slot.m === 0 ? (slot.h < 12 ? `${slot.h}am` : slot.h === 12 ? "12pm" : `${slot.h - 12}pm`) : `${slot.h}:${slot.m}`}
                    </span>
                  </div>
                ))}
              </td>
              {DAYS.map((_, dayIndex) => {
                const dayEntries = getEntriesForDay(dayIndex);
                return (
                  <td key={dayIndex} className={`p-0 border-r border-gray-100 last:border-r-0 relative bg-white align-top ${selectedDay === dayIndex ? '' : 'hidden md:table-cell'}`} style={{ height: HOURS.length * (HOUR_HEIGHT / 2) }}>
                    {/* 30-min grid lines */}
                    {HOURS.map((slot) => (
                      <div 
                        key={`${slot.h}:${slot.m}`} 
                        style={{ height: HOUR_HEIGHT / 2 }} 
                        className="border-b border-gray-50 w-full hover:bg-blue-50/20 cursor-crosshair"
                        onClick={() => !showAdd && !editingEntry && openAddModal(dayIndex, slot.h, slot.m)}
                      />
                    ))}

                    {/* Entries Layer */}
                    {!loading && (() => {
                      const sorted = [...dayEntries].sort((a, b) => a.start_time.localeCompare(b.start_time));
                      const columns: Entry[][] = [];
                      
                      sorted.forEach(entry => {
                        let placed = false;
                        for (let i = 0; i < columns.length; i++) {
                          const lastInCol = columns[i][columns[i].length - 1];
                          if (entry.start_time >= lastInCol.end_time) {
                            columns[i].push(entry);
                            placed = true;
                            break;
                          }
                        }
                        if (!placed) columns.push([entry]);
                      });

                      const totalCols = columns.length;
                      return columns.flatMap((col, colIndex) => 
                        col.map(entry => {
                          const { top, height } = calculatePosition(entry.start_time, entry.end_time);
                          const isShort = height < 25;
                          const width = 100 / totalCols;
                          const left = colIndex * width;

                          return (
                            <button
                              key={entry.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                openEditModal(entry);
                              }}
                              className="absolute rounded-lg shadow-md border border-black/20 transition-all hover:scale-[1.01] active:scale-95 z-10 overflow-hidden flex flex-col p-2"
                              style={{ 
                                top: top + 2, 
                                height: height - 4,
                                left: `${left + 0.5}%`,
                                width: `${width - 1}%`,
                                backgroundColor: entry.color,
                                color: '#ffffff',
                                borderLeft: '4px solid rgba(0,0,0,0.2)'
                              }}
                            >
                              <div className={`text-[10px] font-black truncate leading-tight ${isShort ? 'mb-0' : 'mb-1'}`}>
                                {entry.title}
                              </div>
                              <div className={`text-[9px] font-bold opacity-90 ${isShort ? 'hidden' : 'block'}`}>
                                {entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}
                              </div>
                            </button>
                          );
                        })
                      );
                    })()}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {(showAdd || editingEntry) && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={closeEntryModal}>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-black text-gray-800 uppercase mb-4">
              {editingEntry ? "Edit timetable entry" : `Add to ${DAYS[showAdd?.day || 0]} at ${showAdd?.hour || 9}:${String(showAdd?.minute || 0).padStart(2, "0")}`}
            </h3>
            <form onSubmit={saveEntry} className="flex flex-col gap-3">
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Activity name..." className="text-sm bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20" autoFocus />
              <select value={form.member_id} onChange={(e) => setForm({ ...form, member_id: e.target.value })} className="text-sm bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                <option value="">Select member...</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
              <select value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: Number(e.target.value) })} className="text-sm bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                {DAYS.map((day, index) => (
                  <option key={day} value={index}>{day}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Start</label>
                  <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="w-full text-sm bg-gray-50 border border-gray-100 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">End</label>
                  <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className="w-full text-sm bg-gray-50 border border-gray-100 rounded-lg px-3 py-2" />
                </div>
              </div>
              <div className="flex gap-1.5">
                {COLORS.map((color) => (
                  <button key={color} type="button" onClick={() => setForm({ ...form, color })} className={`w-7 h-7 rounded-full transition-all ${form.color === color ? "ring-2 ring-offset-1 ring-gray-400 scale-110" : ""}`} style={{ backgroundColor: color }} />
                ))}
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                <input type="checkbox" checked={form.is_alternating} onChange={(e) => setForm({ ...form, is_alternating: e.target.checked })} className="w-4 h-4 rounded" />
                Alternating weeks
              </label>
              <div className="flex gap-2">
                {editingEntry ? (
                  <button type="button" onClick={() => handleDelete(editingEntry.id)} className="px-4 bg-red-100 text-red-600 text-xs font-bold py-2.5 rounded-lg hover:bg-red-200">
                    Delete
                  </button>
                ) : null}
                <button type="submit" className="flex-1 bg-blue-600 text-white text-xs font-bold py-2.5 rounded-lg hover:bg-blue-700">
                  {editingEntry ? "Save Changes" : "Add"}
                </button>
                <button type="button" onClick={closeEntryModal} className="px-4 bg-gray-200 text-gray-600 text-xs font-bold py-2.5 rounded-lg hover:bg-gray-300">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImport && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowImport(false)}>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-black text-gray-800 uppercase mb-4">Upload timetable CSV</h3>
            <div className="space-y-4">
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700">
                Use columns: <span className="font-bold">title, day, start_time, end_time</span> and optionally <span className="font-bold">member</span>, <span className="font-bold">color</span>, <span className="font-bold">is_alternating</span>.
              </div>
              <select value={importMemberId} onChange={(e) => setImportMemberId(e.target.value)} className="w-full text-sm bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                <option value="">Use member from CSV, or choose one here...</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                <input type="checkbox" checked={replaceMemberSchedule} onChange={(e) => setReplaceMemberSchedule(e.target.checked)} className="w-4 h-4 rounded" />
                Replace the selected family member&apos;s current timetable before importing
              </label>
              <input type="file" accept=".csv" onChange={handleImportFile} disabled={importing} className="w-full text-sm bg-gray-50 border border-gray-100 rounded-lg px-3 py-2" />
              <div className="text-[11px] text-gray-400">
                Example row: <span className="font-mono">School Drop Off,Mon,08:30,09:00,Olivia</span>
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={() => setShowImport(false)} className="px-4 bg-gray-200 text-gray-600 text-xs font-bold py-2.5 rounded-lg hover:bg-gray-300">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
