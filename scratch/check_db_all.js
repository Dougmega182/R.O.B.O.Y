const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkDb() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase URL or Key in .env.local");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const tables = ["household_members", "chores", "transactions", "meal_plans", "lists", "list_items", "household_settings"];
  
  for (const table of tables) {
    console.log(`Checking ${table} table...`);
    const { data, error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      console.error(`Error fetching ${table}:`, error.message);
    } else {
      console.log(`Table ${table} exists.`);
    }
  }
}

checkDb();
