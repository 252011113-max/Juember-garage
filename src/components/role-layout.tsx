import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { requireRole } from "@/lib/auth/require-role";
import { getRoleHome, type Role } from "@/lib/roles";

type RoleLayoutProps = {
  role: Role;
  children: ReactNode;
};

const customerLinks = [
  { href: "/customer", label: "Dashboard" },
  { href: "/customer/antrian", label: "Ambil antrian" },
  { href: "/customer/kendaraan", label: "Kendaraan" },
  { href: "/customer/riwayat", label: "Riwayat" },
  { href: "/customer/profil", label: "Profil" },
];

const adminLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/antrian", label: "Antrian" },
  { href: "/admin/users", label: "Pengguna" },
  { href: "/admin/layanan", label: "Jenis servis" },
  { href: "/admin/pengaturan", label: "Pengaturan" },
  { href: "/admin/laporan", label: "Laporan" },
  { href: "/display", label: "Display publik" },
];

const mechanicLinks = [
  { href: "/mechanic", label: "Dashboard" },
  { href: "/mechanic/pekerjaan", label: "Pekerjaan hari ini" },
  { href: "/mechanic/riwayat", label: "Riwayat pekerjaan" },
];

const rolePresentation = {
  CUSTOMER: {
    title: "Portal Pelanggan",
    description: "Kendaraan dan antrian servis Anda",
    accent: "text-amber-400",
    badge: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    navigation: customerLinks,
    navigationLabel: "Navigasi pelanggan",
    width: "max-w-6xl",
  },
  ADMIN: {
    title: "Panel Administrasi",
    description: "Operasional dan pengelolaan bengkel",
    accent: "text-orange-400",
    badge: "border-orange-400/30 bg-orange-400/10 text-orange-200",
    navigation: adminLinks,
    navigationLabel: "Navigasi admin",
    width: "max-w-7xl",
  },
  MECHANIC: {
    title: "Ruang Kerja Mekanik",
    description: "Tugas servis dan pekerjaan bengkel",
    accent: "text-cyan-400",
    badge: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
    navigation: mechanicLinks,
    navigationLabel: "Navigasi mekanik",
    width: "max-w-6xl",
  },
} as const;

export function RoleLayout({ role, children }: RoleLayoutProps) {
  return (
    <Suspense fallback={<RoleLoading />}>
      <AuthenticatedRoleLayout role={role}>{children}</AuthenticatedRoleLayout>
    </Suspense>
  );
}

async function AuthenticatedRoleLayout({
  role,
  children,
}: RoleLayoutProps) {
  const user = await requireRole(role);
  const presentation = rolePresentation[role];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900">
        <div
          className={`mx-auto flex ${presentation.width} flex-wrap items-center justify-between gap-3 px-4 py-4`}
        >
          <Link
            className={`font-black tracking-tight ${presentation.accent}`}
            href={getRoleHome(role)}
          >
            BENGKEL ANTRIAN
          </Link>
          <div className="flex items-center gap-3">
            <span
              className={`hidden rounded-full border px-3 py-1 text-xs font-semibold sm:inline-flex ${presentation.badge}`}
            >
              {presentation.title}
            </span>
            <span className="text-sm text-slate-300">{user.name}</span>
            <SignOutButton />
          </div>
        </div>
        <div className={`mx-auto ${presentation.width} px-4 pb-3`}>
          <div className="mb-2 flex items-center justify-between gap-3 sm:hidden">
            <span className={`text-xs font-bold ${presentation.accent}`}>
              {presentation.title}
            </span>
            <span className="text-xs text-slate-500">
              {presentation.description}
            </span>
          </div>
          <nav
            aria-label={presentation.navigationLabel}
            className="flex gap-2 overflow-x-auto"
          >
            {presentation.navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-700 hover:bg-slate-800 ${presentation.accent}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className={`mx-auto ${presentation.width} px-4 py-8`}>
        {children}
      </main>
    </div>
  );
}

function RoleLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-sm text-slate-400" role="status">
        Memuat area akun...
      </p>
    </main>
  );
}
