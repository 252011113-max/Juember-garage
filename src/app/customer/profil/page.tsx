import { Suspense } from "react";
import { ProfileForm } from "@/components/customer/profile-form";
import { CustomerPageLoading } from "@/components/customer/page-loading";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";

export default function CustomerProfilePage() {
  return (
    <Suspense fallback={<CustomerPageLoading />}>
      <CustomerProfile />
    </Suspense>
  );
}

async function CustomerProfile() {
  const user = await requireRole("CUSTOMER");
  const profile = await prisma.user.findFirst({
    where: { id: user.id, role: "CUSTOMER" },
    select: { name: true, email: true, phone: true },
  });

  if (!profile) {
    return (
      <p role="alert" className="rounded-xl border border-red-900 bg-red-950 p-5">
        Data profil tidak ditemukan.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-400">
          Pengaturan akun
        </p>
        <h1 className="mt-2 text-3xl font-bold">Profil saya</h1>
      </header>
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-7">
        <p className="mb-5 text-sm text-slate-400">
          Email akun: <span className="text-slate-200">{profile.email}</span>
        </p>
        <ProfileForm name={profile.name} phone={profile.phone ?? ""} />
      </section>
    </div>
  );
}
