import { withUser } from "@/shared/presentation/http";
import { globalSearch } from "../../application/searchUseCases";

/** Apply the limit of 60 requests per minute per IP before authentication. */
export const GET = withUser(
  (req, userId) => globalSearch(userId, new URL(req.url).searchParams.get("q")),
  { errorCode: "search.searchFailed", rateLimit: { keyPrefix: "search", limit: 60, windowMs: 60_000 } },
);
