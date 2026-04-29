import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId') || 'u1';
  const supabase = createClient();
  
  // 1. Get transactions for this account
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("member_id", accountId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("GET /api/ledger Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 2. Calculate balance
  const balance = (transactions || []).reduce((acc, t) => {
    return t.type === "income" ? acc + t.amount : acc - t.amount;
  }, 0);

  // We convert to cents for compatibility with existing UI if needed, 
  // but the UI seems to expect balance_cents.
  const balance_cents = Math.round(balance * 100);

  return NextResponse.json({
    version: (transactions || []).length,
    balance_cents,
    transactions: (transactions || []).map(t => ({
      ...t,
      amount_cents: Math.round(t.amount * 100),
      reason: t.description
    }))
  }, {
    headers: {
      "x-version": (transactions || []).length.toString()
    }
  });
}

export async function POST(request: Request) {
  try {
    const { accountId, amount, reason } = await request.json();
    const supabase = createClient();

    const { data, error } = await supabase
      .from("transactions")
      .insert([{
        member_id: accountId,
        amount: Math.abs(amount / 100),
        type: amount >= 0 ? "income" : "expense",
        description: reason,
        date: new Date().toISOString().split("T")[0]
      }])
      .select()
      .single();

    if (error) throw error;

    // Recalculate balance for response
    const { data: all } = await supabase.from("transactions").select("amount, type").eq("member_id", accountId);
    const balance = (all || []).reduce((acc, t) => t.type === "income" ? acc + t.amount : acc - t.amount, 0);

    return NextResponse.json({ success: true, balance: Math.round(balance * 100) });
  } catch (error: any) {
    console.error("POST /api/ledger Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

