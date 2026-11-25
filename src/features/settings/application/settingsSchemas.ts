import { z } from "zod";
import { ROUTES } from "@/shared/config/routes";

const hhmmRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const updateSettingsSchema = z.object({
  theme: z.enum(["light", "dark"]).optional(),
  fontSize: z.enum(["sm", "md", "lg"]).optional(),
  notificationsEnabled: z.boolean().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietStart: z.string().regex(hhmmRegex).optional(),
  quietEnd: z.string().regex(hhmmRegex).optional(),
  defaultStartRoute: z
    .enum([ROUTES.dashboard, ROUTES.diary, ROUTES.nutrition, ROUTES.calendar, ROUTES.budget, ROUTES.chat])
    .optional(),
  weatherCity: z.enum(["auto", "hanoi", "hcm", "danang"]).optional(),
  starRoamEnabled: z.boolean().optional(),
  starPersonality: z.enum(["cute", "cool", "tsundere", "energetic", "zen"]).optional(),
  starSoundEnabled: z.boolean().optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
