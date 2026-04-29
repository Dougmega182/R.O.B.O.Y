import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("household_settings")
    .select("key, value")
    .in("key", ["reward_opening_balances", "bills_ledger_reset_date"]);

  const openingBalancesSetting = data?.find((row) => row.key === "reward_opening_balances")?.value;
  const billsLedgerResetDate = data?.find((row) => row.key === "bills_ledger_reset_date")?.value || new Date().toISOString().split("T")[0];

  let openingBalances: Record<string, number> = {};
  try {
    openingBalances = openingBalancesSetting ? JSON.parse(openingBalancesSetting) : {};
  } catch {
    openingBalances = {};
  }

  return NextResponse.json({
    openingBalances,
    billsLedgerResetDate,
  });
}

export async function POST(req: Request) {
  const supabase = createAdminClient();
  const body = await req.json();

  if (body.action === "set_opening_balances") {
    const { error } = await supabase
      .from("household_settings")
      .upsert({ key: "reward_opening_balances", value: JSON.stringify(body.openingBalances || {}) });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body.action === "reset_bills_ledger") {
    const resetDate = body.resetDate || new Date().toISOString().split("T")[0];
    const { error } = await supabase
      .from("household_settings")
      .upsert({ key: "bills_ledger_reset_date", value: resetDate });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, resetDate });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
