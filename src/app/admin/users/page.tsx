import { Suspense } from "react";
import { AdminUserCreateForm, AdminUserItem } from "@/components/admin/admin-forms";
import { CustomerPageLoading } from "@/components/customer/page-loading";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<CustomerPageLoading />}>
      <AdminUsers />
    </Suspense>
  );
}

async function AdminUsers() {
  await requireRole("ADMIN");
  const users = await prisma.user.findMany({
    where: { role: { in: ["CUSTOMER", "MECHANIC"] } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
    },
  });

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-400">Manajemen akun</p>
        <h1 className="mt-2 text-3xl font-bold">Pengguna</h1>
        <p className="mt-2 text-sm text-slate-400">Kelola akun customer dan mekanik. Password tidak pernah ditampilkan.</p>
      </header>
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-4 text-xl font-bold">Tambah akun</h2>
        <AdminUserCreateForm />
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-bold">Daftar akun ({users.length})</h2>
        {users.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-slate-400">Belum ada akun customer atau mekanik.</div>
        ) : users.map((user) => (
          <AdminUserItem
            key={user.id}
            user={{
              ...user,
              role: user.role === "MECHANIC" ? "MECHANIC" : "CUSTOMER",
            }}
          />
        ))}
      </section>
    </div>
  );
}
