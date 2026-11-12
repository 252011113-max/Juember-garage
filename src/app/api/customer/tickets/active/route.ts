import { NextResponse } from "next/server";
import { getCustomerUserId } from "@/lib/auth/customer";
import { getCustomerQueueOverview } from "@/lib/queue/customer-overview";

export async function GET() {
  const customerId = await getCustomerUserId();
  if (!customerId) {
    return NextResponse.json(
      { error: "Sesi pelanggan tidak aktif. Silakan masuk kembali." },
      { status: 401 },
    );
  }

  const tickets = await getCustomerQueueOverview(customerId);
  return NextResponse.json(
    { tickets },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
