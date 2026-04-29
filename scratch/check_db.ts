import { createClient } from "./app/lib/supabase/server";

async function checkDb() {
  const supabase = createClient();
  
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
