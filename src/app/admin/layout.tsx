import type { ReactNode } from "react";
import { RoleLayout } from "@/components/role-layout";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <RoleLayout role="ADMIN">{children}</RoleLayout>;
}
