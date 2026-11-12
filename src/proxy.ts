import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/auth.config";
import { getRoleHome, type Role } from "@/lib/roles";

const { auth } = NextAuth(authConfig);

const protectedAreas = [
  { prefix: "/admin", role: "ADMIN" },
  { prefix: "/mechanic", role: "MECHANIC" },
  { prefix: "/customer", role: "CUSTOMER" },
] as const satisfies ReadonlyArray<{ prefix: string; role: Role }>;

export const proxy = auth((request) => {
  const { pathname } = request.nextUrl;
  const user = request.auth?.user;
  const protectedArea = protectedAreas.find(({ prefix }) =>
    pathname.startsWith(prefix),
  );

  if (protectedArea && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user?.role && protectedArea && user.role !== protectedArea.role) {
    return NextResponse.redirect(new URL(getRoleHome(user.role), request.url));
  }

  if (user && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL(getRoleHome(user.role), request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/admin/:path*",
    "/mechanic/:path*",
    "/customer/:path*",
    "/login",
    "/register",
  ],
};
