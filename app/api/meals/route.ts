import { createAdminClient } from "@/lib/supabase/server";
import { logFeedItem } from "@/lib/feed";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const supabase = createAdminClient();
  const url = new URL(req.url);
  const weekStart = url.searchParams.get("weekStart");

  const applyWeekFilter = <T extends { gte: Function; lte: Function }>(query: T) => {
    if (!weekStart) return query;

    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    return query
      .gte("date", start.toISOString().split("T")[0])
      .lte("date", end.toISOString().split("T")[0]);
  };

  let query = applyWeekFilter(
    supabase
      .from("meal_plans")
      .select("*, recipes(*, recipe_ingredients(*)), meal_ingredients(*)")
      .order("date")
      .order("meal_type")
  );

  let { data, error } = await query;

  if (error) {
    console.error("GET /api/meals primary query failed:", error);

    const fallbackQuery = applyWeekFilter(
      supabase
        .from("meal_plans")
        .select("*, recipe:recipes(*), meal_ingredients(*)")
        .order("date")
        .order("meal_type")
    );

    const fallbackResult = await fallbackQuery;
    data = fallbackResult.data;
    error = fallbackResult.error;

    if (!error && Array.isArray(data)) {
      data = data.map((meal: any) => ({
        ...meal,
        recipes: meal.recipe ?? null,
      }));
    }
  }

  if (error) {
    console.error("GET /api/meals fallback query failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const supabase = createAdminClient();
  const body = await req.json();

  if (body.action === "delete") {
    // Delete meal-specific ingredients if any
    await supabase.from("meal_ingredients").delete().eq("meal_plan_id", body.id);
    // Delete the plan, but NOT the recipe
    const { error } = await supabase.from("meal_plans").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body.action === "add_ingredient") {
    const { data, error } = await supabase
      .from("meal_ingredients")
      .insert([{ meal_plan_id: body.meal_plan_id, ingredient: body.ingredient, quantity: body.quantity }])
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (body.action === "remove_ingredient") {
    const { error } = await supabase.from("meal_ingredients").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body.action === "generate_shopping") {
    const { data, error } = await supabase
      .from("meal_ingredients")
      .select("ingredient, quantity")
      .eq("added_to_list", false);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  }

  // Handle creating a new recipe and scheduling it
  let recipeId = body.recipe_id;

  if (!recipeId && body.name) {
    // Create new master recipe
    const { data: recipeData, error: recipeError } = await supabase
      .from("recipes")
      .insert([{
        name: body.name,
        recipe_url: body.recipe_url,
        image_url: body.image_url,
        instructions: body.notes
      }])
      .select().single();

    if (recipeError) {
      console.error("Recipe Insert Error:", recipeError);
      return NextResponse.json({ error: recipeError.message }, { status: 500 });
    }
    recipeId = recipeData.id;

    // Insert recipe ingredients
    if (body.ingredients && Array.isArray(body.ingredients)) {
      const recipeIngredients = body.ingredients.map((ing: string) => ({
        recipe_id: recipeId,
        ingredient: ing
      }));
      await supabase.from("recipe_ingredients").insert(recipeIngredients);
    }
  }

  const { data, error } = await supabase
    .from("meal_plans")
    .insert([{ 
      date: body.date, 
      meal_type: body.meal_type, 
      recipe_id: recipeId,
      name: body.name, // Fallback/Override
      recipe_url: body.recipe_url, 
      image_url: body.image_url,
      notes: body.notes 
    }])
    .select().single();

  if (error) {
    console.error("Meal Plan Insert Error:", error);
    return NextResponse.json({ error: error.message, details: error.details }, { status: 500 });
  }

  await logFeedItem({
    type: "event",
    title: `Meal planned: ${body.name || `Planned ${body.meal_type}`}`,
    subtitle: `${body.meal_type} scheduled for ${body.date}`,
    icon: "🍽",
    status: "active",
  });

  return NextResponse.json(data);
}
