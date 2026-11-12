import type { ReactNode } from "react";
import { RoleLayout } from "@/components/role-layout";

export default function MechanicLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <RoleLayout role="MECHANIC">{children}</RoleLayout>;
}
