import { z } from "zod";
import { messageKey } from "@/shared/application/errors";
import { toOptionalNumber, type ProfileFormInput } from "../domain/profileData";

const optionalMeasurement = z.unknown().transform(toOptionalNumber).optional();

export const updateProfileSchema = z.object(
  {
    // Preserve existing coercion for supplied values. Trim names and convert empty image strings to null.
    name: z.unknown().transform((v) => String(v).trim()).optional(),
    image: z.unknown().transform((v) => (v ? String(v) : null)).optional(),
    gender: z.string({ error: messageKey("profile.invalidGender") }).nullish(),
    activityLevel: z.string({ error: messageKey("profile.invalidActivityLevel") }).nullish(),
    weightKg: optionalMeasurement,
    heightCm: optionalMeasurement,
    age: optionalMeasurement,
  },
  { error: messageKey("common.invalidBody") },
);

export interface UpdateProfileInput extends ProfileFormInput {
  /** Omit the name to preserve it. */
  name?: string;
  /** Omit the image to preserve it or send null to clear it. */
  image?: string | null;
}
