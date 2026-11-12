"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ redirectTo: "/login" })}
      className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold transition hover:border-amber-400 hover:text-amber-300"
    >
      Keluar
    </button>
  );
}
