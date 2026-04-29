import { logFeedItem } from "@/lib/feed";
import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Bill = {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  status: "outstanding" | "paid";
  paidAt?: string;
  archived?: boolean;
  transactionId?: string;
};

async function readBills(supabase: ReturnType<typeof createAdminClient>) {
  const { data: billsSetting } = await supabase
    .from("household_settings")
    .select("value")
    .eq("key", "bills_registry")
    .maybeSingle();

  const { data: resetSetting } = await supabase
    .from("household_settings")
    .select("value")
    .eq("key", "bills_ledger_reset_date")
    .maybeSingle();

  let bills: Bill[] = [];
  try {
    bills = billsSetting?.value ? JSON.parse(billsSetting.value) : [];
  } catch {
    bills = [];
  }

  const resetDate = resetSetting?.value || new Date().toISOString().split("T")[0];
  return { bills, resetDate };
}

async function writeBills(supabase: ReturnType<typeof createAdminClient>, bills: Bill[]) {
  return supabase
    .from("household_settings")
    .upsert({ key: "bills_registry", value: JSON.stringify(bills) });
}

export async function GET() {
  const supabase = createAdminClient();
  const { bills, resetDate } = await readBills(supabase);

  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount, date")
    .eq("category", "Bills")
    .gte("date", resetDate);

  const totalExpenditureToDate = (transactions || []).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  return NextResponse.json({
    bills: bills.filter((bill) => !bill.archived),
    allBills: bills,
    resetDate,
    totalExpenditureToDate,
  });
}

export async function POST(req: Request) {
  const supabase = createAdminClient();
  const body = await req.json();
  const { bills } = await readBills(supabase);

  if (body.action === "create") {
    const nextBill: Bill = {
      id: crypto.randomUUID(),
      name: body.name,
      amount: Number(body.amount),
      dueDate: body.dueDate,
      status: "outstanding",
      archived: false,
    };
    const nextBills = [nextBill, ...bills];
    const { error } = await writeBills(supabase, nextBills);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(nextBill);
  }

  if (body.action === "toggle_paid") {
    const bill = bills.find((entry) => entry.id === body.id);
    if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 });

    let transactionId = bill.transactionId;

    if (bill.status === "outstanding") {
      const { data: transaction, error: transactionError } = await supabase
        .from("transactions")
        .insert([{
          description: `Bill paid: ${bill.name}`,
          amount: Number(bill.amount),
          type: "expense",
          category: "Bills",
          member_id: null,
          date: new Date().toISOString().split("T")[0],
          is_spriggy: false,
        }])
        .select()
        .single();

      if (transactionError) return NextResponse.json({ error: transactionError.message }, { status: 500 });
      transactionId = transaction.id;

      await logFeedItem({
        type: "event",
        title: `Bill paid: ${bill.name}`,
        subtitle: `$${Number(bill.amount).toFixed(2)} recorded in household expenses`,
        icon: "🧾",
        status: "active",
      });
    } else if (bill.transactionId) {
      await supabase.from("transactions").delete().eq("id", bill.transactionId);
      transactionId = undefined;
    }

    const nextBills: Bill[] = bills.map((entry) =>
      entry.id === body.id
        ? {
            ...entry,
            status: entry.status === "outstanding" ? "paid" as const : "outstanding" as const,
            paidAt: entry.status === "outstanding" ? new Date().toISOString() : undefined,
            transactionId,
          }
        : entry
    );

    const { error } = await writeBills(supabase, nextBills);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body.action === "clear_paid") {
    const targetMonth = body.month || new Date().toISOString().slice(0, 7);
    const nextBills = bills.map((bill) => {
      if (bill.status === "paid" && bill.dueDate.startsWith(targetMonth)) {
        return { ...bill, archived: true };
      }
      return bill;
    });

    const { error } = await writeBills(supabase, nextBills);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
