export const roles = ["ADMIN", "MECHANIC", "CUSTOMER"] as const;

export type Role = (typeof roles)[number];

export function isRole(value: string): value is Role {
  return roles.some((role) => role === value);
}

export function getRoleHome(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "MECHANIC":
      return "/mechanic";
    case "CUSTOMER":
      return "/customer";
  }
}
