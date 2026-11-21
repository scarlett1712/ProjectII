import { appYearMonth } from "@/shared/domain/time";
import { withUser } from "@/shared/presentation/http";
import { periodQuerySchema } from "../../application/budgetSchemas";
import { getBudgetOverview } from "../../application/budgetUseCases";

/** Year and month default to the current month in Vietnam. Invalid values return 400. */
export const GET = withUser(
  (req, userId) => {
    const { searchParams } = new URL(req.url);
    const query = periodQuerySchema.parse({ year: searchParams.get("year"), month: searchParams.get("month") });
    const current = appYearMonth(new Date());
    return getBudgetOverview(userId, query.year ?? current.year, query.month ?? current.month);
  },
  { errorCode: "budget.loadOverviewFailed" },
);
