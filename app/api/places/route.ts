import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("places")
    .select("*")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const supabase = createAdminClient();
  const body = await req.json();

  if (body.action === "delete") {
    const { error } = await supabase.from("places").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  let lat = body.lat;
  let lng = body.lng;

  // Attempt geocoding if lat/lng are missing
  if (!lat || !lng) {
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(body.address)}&limit=1`, {
        headers: { 'User-Agent': 'FamilyWall-Household-OS' }
      });
      const geoData = await geoRes.json();
      if (geoData && geoData[0]) {
        lat = parseFloat(geoData[0].lat);
        lng = parseFloat(geoData[0].lon);
      }
    } catch (e) {
      console.error("Geocoding failed:", e);
    }
  }

  const { data, error } = await supabase
    .from("places")
    .insert([{
      name: body.name,
      address: body.address,
      lat: lat || null,
      lng: lng || null,
      category: body.category || "Favorite"
    }])
    .select().single();
    
  if (error) {
    console.error("POST /api/places Error:", error);
    return NextResponse.json({ 
      error: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    }, { status: 500 });
  }
  return NextResponse.json(data);
}
