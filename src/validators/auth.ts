import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required") // fires before .email() to give "required" instead of "invalid" on empty input
    .email("Enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required"), // login doesn't re-enforce registration password policy
});

export const registerSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name is too long"),
  email: z
    .string()
    .min(1, "Email is required") // fires before .email() to give "required" instead of "invalid" on empty input
    .email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long"), // bcrypt silently truncates at 72 chars
  businessName: z
    .string()
    .min(2, "Business name must be at least 2 characters")
    .max(100, "Business name is too long"),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required") // fires before .email() to give "required" instead of "invalid" on empty input
    .email("Enter a valid email address"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
