import { z } from "zod";

export const dispatchCaseSchema = z.object({
  vehicleId: z.coerce.number().int().positive("A valid vehicle is required."),
});
