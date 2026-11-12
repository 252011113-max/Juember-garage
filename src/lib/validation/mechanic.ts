import { z } from "zod";
import { resourceIdSchema } from "@/lib/validation/customer";

const costSchema = z.number().int().min(0).max(1_000_000_000);

export const mechanicCompletionSchema = z.object({
  ticketId: resourceIdSchema,
  notes: z.string().trim().min(5, "Catatan servis minimal 5 karakter.").max(2000),
  partsUsed: z
    .array(z.string().trim().min(1).max(100))
    .max(30, "Maksimal 30 jenis suku cadang."),
  laborCost: costSchema,
  partsCost: costSchema,
});
