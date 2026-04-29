import { getGoogleToken } from "@/lib/google";
import { NextResponse } from "next/server";

export async function GET() {
  const token = await getGoogleToken();

  if (!token) {
    return NextResponse.json({ error: "Google Auth Required" }, { status: 401 });
  }

  try {
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Google Calendar API responded with " + response.status);
    }

    const data = await response.json();
    const calendars = (data.items || []).filter((calendar: any) => !calendar.primary);
    
    return NextResponse.json({ calendars });
  } catch (error: any) {
    console.error("Calendar List Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

