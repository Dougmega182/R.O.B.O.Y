import { createAdminClient } from "@/lib/supabase/server";
import { logFeedItem } from "@/lib/feed";
import { NextResponse } from "next/server";

type MealPlanRow = {
  id: string;
  date: string;
  meal_type: string;
  recipe_id?: string | null;
  name?: string | null;
  recipe_url?: string | null;
  image_url?: string | null;
  notes?: string | null;
  created_at?: string;
};

type RecipeRow = {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  recipe_url?: string | null;
  instructions?: string | null;
  prep_time?: string | null;
  cook_time?: string | null;
  is_favorite?: boolean | null;
  created_at?: string;
};

type IngredientRow = {
  id: string;
  ingredient: string;
  quantity?: string | null;
  added_to_list?: boolean | null;
  meal_plan_id?: string | null;
  recipe_id?: string | null;
  created_at?: string;
};

function applyWeekBounds<T extends { gte: Function; lte: Function }>(query: T, weekStart: string | null) {
  if (!weekStart) return query;

  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  return query.gte("date", start.toISOString().split("T")[0]).lte("date", end.toISOString().split("T")[0]);
}

export async function GET(req: Request) {
  const supabase = createAdminClient();
  const url = new URL(req.url);
  const weekStart = url.searchParams.get("weekStart");

  const mealPlansQuery = applyWeekBounds(
    supabase.from("meal_plans").select("*").order("date").order("meal_type"),
    weekStart
  );

  const { data: mealPlans, error: mealPlansError } = await mealPlansQuery;
  if (mealPlansError) {
    console.error("GET /api/meals meal_plans query failed:", mealPlansError);
    return NextResponse.json({ error: mealPlansError.message }, { status: 500 });
  }

  const meals = Array.isArray(mealPlans) ? (mealPlans as MealPlanRow[]) : [];
  if (meals.length === 0) {
    return NextResponse.json([]);
  }

  const recipeIds = Array.from(new Set(meals.map((meal) => meal.recipe_id).filter((value): value is string => !!value)));
  const mealIds = meals.map((meal) => meal.id);

  const [recipesResult, mealIngredientsResult, recipeIngredientsResult] = await Promise.all([
    recipeIds.length > 0
      ? supabase.from("recipes").select("*").in("id", recipeIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("meal_ingredients").select("*").in("meal_plan_id", mealIds).order("created_at"),
    recipeIds.length > 0
      ? supabase.from("recipe_ingredients").select("*").in("recipe_id", recipeIds).order("created_at")
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (recipesResult.error) {
    console.error("GET /api/meals recipes query failed:", recipesResult.error);
    return NextResponse.json({ error: recipesResult.error.message }, { status: 500 });
  }

  if (mealIngredientsResult.error) {
    console.error("GET /api/meals meal_ingredients query failed:", mealIngredientsResult.error);
    return NextResponse.json({ error: mealIngredientsResult.error.message }, { status: 500 });
  }

  if (recipeIngredientsResult.error) {
    console.error("GET /api/meals recipe_ingredients query failed:", recipeIngredientsResult.error);
    return NextResponse.json({ error: recipeIngredientsResult.error.message }, { status: 500 });
  }

  const recipes = Array.isArray(recipesResult.data) ? (recipesResult.data as RecipeRow[]) : [];
  const mealIngredients = Array.isArray(mealIngredientsResult.data) ? (mealIngredientsResult.data as IngredientRow[]) : [];
  const recipeIngredients = Array.isArray(recipeIngredientsResult.data) ? (recipeIngredientsResult.data as IngredientRow[]) : [];

  const recipeIngredientsByRecipeId = new Map<string, IngredientRow[]>();
  for (const ingredient of recipeIngredients) {
    if (!ingredient.recipe_id) continue;
    const list = recipeIngredientsByRecipeId.get(ingredient.recipe_id) ?? [];
    list.push(ingredient);
    recipeIngredientsByRecipeId.set(ingredient.recipe_id, list);
  }

  const mealIngredientsByMealId = new Map<string, IngredientRow[]>();
  for (const ingredient of mealIngredients) {
    if (!ingredient.meal_plan_id) continue;
    const list = mealIngredientsByMealId.get(ingredient.meal_plan_id) ?? [];
    list.push(ingredient);
    mealIngredientsByMealId.set(ingredient.meal_plan_id, list);
  }

  const recipeById = new Map(
    recipes.map((recipe) => [
      recipe.id,
      {
        ...recipe,
        recipe_ingredients: recipeIngredientsByRecipeId.get(recipe.id) ?? [],
      },
    ])
  );

  const response = meals.map((meal) => ({
    ...meal,
    recipes: meal.recipe_id ? recipeById.get(meal.recipe_id) ?? null : null,
    meal_ingredients: mealIngredientsByMealId.get(meal.id) ?? [],
  }));

  return NextResponse.json(response);
}

export async function POST(req: Request) {
  const supabase = createAdminClient();
  const body = await req.json();

  if (body.action === "delete") {
    await supabase.from("meal_ingredients").delete().eq("meal_plan_id", body.id);
    const { error } = await supabase.from("meal_plans").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body.action === "add_ingredient") {
    const { data, error } = await supabase
      .from("meal_ingredients")
      .insert([{ meal_plan_id: body.meal_plan_id, ingredient: body.ingredient, quantity: body.quantity }])
      .select()
      .single();
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

  let recipeId = body.recipe_id;

  if (!recipeId && body.name) {
    const { data: recipeData, error: recipeError } = await supabase
      .from("recipes")
      .insert([
        {
          name: body.name,
          recipe_url: body.recipe_url,
          image_url: body.image_url,
          instructions: body.notes,
        },
      ])
      .select()
      .single();

    if (recipeError) {
      console.error("Recipe Insert Error:", recipeError);
      return NextResponse.json({ error: recipeError.message }, { status: 500 });
    }
    recipeId = recipeData.id;

    if (body.ingredients && Array.isArray(body.ingredients)) {
      const recipeIngredients = body.ingredients.map((ing: string) => ({
        recipe_id: recipeId,
        ingredient: ing,
      }));
      await supabase.from("recipe_ingredients").insert(recipeIngredients);
    }
  }

  const { data, error } = await supabase
    .from("meal_plans")
    .insert([
      {
        date: body.date,
        meal_type: body.meal_type,
        recipe_id: recipeId,
        name: body.name,
        recipe_url: body.recipe_url,
        image_url: body.image_url,
        notes: body.notes,
      },
    ])
    .select()
    .single();

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
