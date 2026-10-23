import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Enter a valid email address.").trim(),
  password: z.string().min(1, "Enter your password.").max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;
