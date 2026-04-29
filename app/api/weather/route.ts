import { NextResponse } from "next/server";

export async function GET() {
  try {
    const lat = -37.7145;
    const lon = 145.1481;

    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=7&timezone=Australia%2FSydney`
    );

    if (!res.ok) throw new Error("Weather service unreachable");

    const data = await res.json();

    return NextResponse.json({
      temp: Math.round(data.current.temperature_2m),
      code: data.current.weather_code,
      forecast: (data.daily?.time || []).map((date: string, index: number) => ({
        date,
        code: data.daily.weather_code[index],
        max: Math.round(data.daily.temperature_2m_max[index]),
        min: Math.round(data.daily.temperature_2m_min[index]),
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Weather offline" }, { status: 500 });
  }
}
