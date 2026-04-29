import { getGoogleToken } from "@/lib/google";
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const token = await getGoogleToken();
  const { searchParams } = new URL(request.url);
  const selectedCalendarId = searchParams.get("calendarId");

  if (!token) {
    return NextResponse.json({ 
      error: "Google Auth Required",
      authenticated: false,
      events: [] 
    }, { status: 401 });
  }

  try {
    const timeMin = new Date().toISOString();
    const calendarId = selectedCalendarId || "primary";

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${timeMin}&maxResults=50&singleEvents=true&orderBy=startTime`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      console.error("Google Calendar Events Error:", err);
      throw new Error("Google Calendar events API responded with " + res.status);
    }

    const data = await res.json();
    const events = (data.items || []).map((item: any) => ({
      id: item.id,
      title: item.summary,
      start: item.start.dateTime || item.start.date,
      end: item.end.dateTime || item.end.date,
      location: item.location,
      link: item.htmlLink,
      calendarId,
    }));

    const mergedEvents = events.sort((a: any, b: any) => 
      new Date(a.start).getTime() - new Date(b.start).getTime()
    ).slice(0, 50);

    return NextResponse.json({ authenticated: true, events: mergedEvents });
  } catch (error: any) {
    console.error("Calendar Route Error:", error);
    return NextResponse.json({ error: error.message, events: [] }, { status: 500 });
  }
}

