import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("recipes")
    .select("*, recipe_ingredients(*)")
    .order("name");

  if (error) {
    console.error("GET /api/recipes Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const supabase = createAdminClient();
  const body = await req.json();

  if (body.action === "delete") {
    const { error } = await supabase.from("recipes").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const { data, error } = await supabase
    .from("recipes")
    .insert([{
      name: body.name,
      description: body.description,
      image_url: body.image_url,
      recipe_url: body.recipe_url,
      prep_time: body.prep_time,
      cook_time: body.cook_time,
      instructions: body.instructions
    }])
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Handle ingredients
  if (body.ingredients && Array.isArray(body.ingredients)) {
    const recipeIngredients = body.ingredients.map((ing: any) => ({
      recipe_id: data.id,
      ingredient: typeof ing === 'string' ? ing : ing.ingredient,
      quantity: ing.quantity || ""
    }));
    await supabase.from("recipe_ingredients").insert(recipeIngredients);
  }

  return NextResponse.json(data);
}
