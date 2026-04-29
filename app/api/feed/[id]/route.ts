import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { canApprove, canArchive } from "@/lib/auth/guards";
import { mapFeedItem } from "@/lib/mappers/feedMapper";

export async function PATCH(
  request: Request, 
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  try {
    const { status, actorId } = await request.json();
    
    // 1. Fetch actor from DB (Relational Security)
    const { data: actor, error: actorError } = await supabase
      .from('household_members')
      .select('*')
      .eq('id', actorId)
      .single();

    if (actorError || !actor) {
      return NextResponse.json({ error: "Unauthorized: Unknown family member." }, { status: 401 });
    }

    // 2. Fetch current item state
    const { data: itemData, error: fetchError } = await supabase
      .from('feed_items')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !itemData) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const item = mapFeedItem(itemData);

    // 3. 🛡️ The Guards
    if (status === "active" && !canApprove(actor as any)) {
      return NextResponse.json({ error: "Permission Denied: Parents must approve this transition" }, { status: 403 });
    }

    if (status === "archived" && !canArchive(actor as any, item as any)) {
      return NextResponse.json({ error: "Permission Denied: You cannot archive an item that isn't yours" }, { status: 403 });
    }

    // 4. Commit the change
    const { data: updatedRaw, error: updateError } = await supabase
      .from('feed_items')
      .update({ 
        status: status, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', params.id)
      .select(`
        *,
        member:household_members(*)
      `)
      .single();

    if (updateError) {
      return NextResponse.json({ error: (updateError as any).message }, { status: 500 });
    }

    const updatedItem = mapFeedItem(updatedRaw);

    // 🚀 5. The "Infinite Loop" Logic
    if (status === "active" && itemData.recurrence && itemData.recurrence !== "none") {
      const { id, created_at, updated_at, status: _s, ...rest } = itemData;
      const nextItem = {
        ...rest,
        id: Math.random().toString(36).substring(2, 15),
        status: "pending",
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      await supabase.from('feed_items').insert([nextItem]);
    }

    return NextResponse.json({ updatedItem });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Transition failed" }, { status: 500 });
  }
}
