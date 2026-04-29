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
  
  console.log("Checking household_members table...");
  const { data: members, error: membersError } = await supabase.from("household_members").select("*");
  if (membersError) {
    console.error("Error fetching members:", membersError);
  } else {
    console.log(`Found ${members?.length || 0} members.`);
    console.log(JSON.stringify(members, null, 2));
  }

  console.log("\nChecking chores table...");
  const { data: chores, error: choresError } = await supabase.from("chores").select("*");
  if (choresError) {
    console.error("Error fetching chores:", choresError);
  } else {
    console.log(`Found ${chores?.length || 0} chores.`);
  }
}

checkDb();
