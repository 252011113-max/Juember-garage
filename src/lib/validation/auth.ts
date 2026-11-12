import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Masukkan email yang valid.").max(254),
  password: z.string().min(1, "Kata sandi wajib diisi.").max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;
