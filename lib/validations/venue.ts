import { z } from "zod";

export const venueSchema = z
  .object({
    name: z.string().trim().min(2, "Venue name is required.").max(80),
    isOnline: z.coerce.boolean().default(false),
    onlineUrl: z.string().trim().url("Enter a valid URL.").max(300).optional().or(z.literal("")),
    addressLine1: z.string().trim().max(120).optional().or(z.literal("")),
    addressLine2: z.string().trim().max(120).optional().or(z.literal("")),
    city: z.string().trim().max(80).optional().or(z.literal("")),
    state: z.string().trim().max(40).optional().or(z.literal("")),
    postalCode: z.string().trim().max(20).optional().or(z.literal("")),
    country: z.string().trim().min(1).max(60).default("USA"),
    capacity: z.coerce.number().int().positive().optional().or(z.literal("")),
    contactName: z.string().trim().max(80).optional().or(z.literal("")),
    contactPhone: z.string().trim().max(30).optional().or(z.literal("")),
    contactEmail: z.string().trim().email().optional().or(z.literal("")),
    notes: z.string().trim().max(500).optional().or(z.literal("")),
    timezone: z.string().trim().min(1),
  })
  .superRefine((data, ctx) => {
    if (data.isOnline) return;
    if (!data.addressLine1) {
      ctx.addIssue({ code: "custom", message: "Address is required.", path: ["addressLine1"] });
    }
    if (!data.city) {
      ctx.addIssue({ code: "custom", message: "City is required.", path: ["city"] });
    }
  });
