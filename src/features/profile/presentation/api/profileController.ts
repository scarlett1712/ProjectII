import { readJson, withUser } from "@/shared/presentation/http";
import { updateProfileSchema } from "../../application/profileSchemas";
import { getProfile, updateProfile } from "../../application/profileUseCases";

export const GET = withUser((_req, userId) => getProfile(userId));

export const POST = withUser(async (req, userId) => updateProfile(userId, updateProfileSchema.parse(await readJson(req))));
