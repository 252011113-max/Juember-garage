import type { ReactNode } from "react";
import { RoleLayout } from "@/components/role-layout";

export default function CustomerLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <RoleLayout role="CUSTOMER">{children}</RoleLayout>;
}
