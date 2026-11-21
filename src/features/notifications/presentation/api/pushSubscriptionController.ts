import { NextResponse } from "next/server";
import { readJson, withUser } from "@/shared/presentation/http";
import { registerSubscriptionSchema, unregisterSubscriptionSchema } from "../../application/notificationSchemas";
import {
  getVapidPublicKey,
  registerPushSubscription,
  unregisterPushSubscription,
} from "../../application/notificationUseCases";

/** Public endpoint. Clients need the public VAPID key before subscribing. */
export async function GET() {
  return NextResponse.json(getVapidPublicKey());
}

export const POST = withUser(
  async (req, userId) => registerPushSubscription(userId, registerSubscriptionSchema.parse(await readJson(req))),
  { errorCode: "common.serverError" },
);

export const DELETE = withUser(
  async (req, userId) => unregisterPushSubscription(userId, unregisterSubscriptionSchema.parse(await readJson(req))),
  { errorCode: "common.serverError" },
);
