import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { ingestFeedItem } from "@/lib/ingestion/router";
import { mapFeedItem } from "@/lib/mappers/feedMapper";

export async function GET() {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('feed_items')
      .select(`
        *,
        member:household_members(*) 
      `)
      .order('updated_at', { ascending: false });

    if (error) {
      throw error;
    }
    
    return NextResponse.json({
      items: (data || []).map(mapFeedItem)
    });
  } catch (error: any) {
    console.error("Live Feed Error:", error);
    return NextResponse.json({ items: [], error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = createClient();
  try {
    const { title, type, actorMemberId } = await request.json();
    
    const normalized = ingestFeedItem({
      type: "MANUAL_FORM",
      payload: { title, type: type || "task" }
    });

    const { data, error } = await supabase
      .from('feed_items')
      .insert([{
        ...normalized,
        actor_member_id: actorMemberId,
        actor_id: null // 🚀 Pure Relational Mode
      }])
      .select(`
        *,
        member:household_members(*)
      `)
      .single();

    if (error) throw error;
    return NextResponse.json(mapFeedItem(data));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

