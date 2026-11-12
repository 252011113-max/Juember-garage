"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { customerRegistrationSchema } from "@/lib/validation/customer";
import type { ActionResult } from "@/lib/actions";

export async function registerCustomer(
  input: unknown,
): Promise<ActionResult> {
  const parsed = customerRegistrationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const { name, email, phone, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        phone,
        passwordHash,
        role: "CUSTOMER",
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, message: "Email tersebut sudah terdaftar." };
    }
    throw error;
  }

  return { ok: true, message: "Akun berhasil dibuat. Silakan masuk." };
}
