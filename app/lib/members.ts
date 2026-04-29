import { createClient } from "@/lib/supabase/client";

export type Member = {
  id: string;
  name: string;
  role: "ADMIN" | "TEEN" | "CHILD";
  avatar: string;
  color: string;
  is_active: boolean;
};

export async function getHouseholdMembers(): Promise<Member[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("household_members")
      .select("*")
      .eq("is_active", true)
      .order("created_at");

    if (error || !data || data.length === 0) {
      // 🚀 Live Mode: No fallback members. If DB is empty, return empty.
      console.warn("Live Registry: No members found in database.");
      return [];
    }
    
    return data as Member[];
  } catch (err) {
    console.error("Critical Identity Error:", err);
    return [];
  }
}

