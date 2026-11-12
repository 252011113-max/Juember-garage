import Link from "next/link";
import { Suspense } from "react";
import { LiveQueue } from "@/components/customer/live-queue";
import { CustomerPageLoading } from "@/components/customer/page-loading";
import { requireRole } from "@/lib/auth/require-role";
import { getCustomerQueueOverview } from "@/lib/queue/customer-overview";

export default function CustomerDashboardPage() {
  return (
    <Suspense fallback={<CustomerPageLoading />}>
      <CustomerDashboard />
    </Suspense>
  );
}

async function CustomerDashboard() {
  const user = await requireRole("CUSTOMER");
  const tickets = await getCustomerQueueOverview(user.id);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-400">
          Area pelanggan
        </p>
        <h1 className="mt-2 text-3xl font-bold">
          Halo, {user.name ?? "Pelanggan"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          Kelola kendaraan, ambil antrian servis, dan pantau status pekerjaan
          dari dashboard ini.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/customer/antrian"
            className="inline-flex min-h-11 items-center rounded-lg bg-amber-400 px-5 font-bold text-slate-950 hover:bg-amber-300"
          >
            Ambil antrian
          </Link>
          <Link
            href="/customer/kendaraan"
            className="inline-flex min-h-11 items-center rounded-lg border border-slate-700 px-5 font-semibold hover:border-amber-400"
          >
            Kelola kendaraan
          </Link>
        </div>
      </section>
      <LiveQueue initialTickets={tickets} />
    </div>
  );
}
