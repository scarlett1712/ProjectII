/**
 * Application page, API and public asset paths.
 * Shared by the server, client and domain layers. ESLint enforces route constants elsewhere.
 *
 * Exceptions: src/proxy.ts needs a literal config.matcher for static analysis by Next.js,
 * and public/sw.js cannot import modules.
 */

/** Page routes. */
export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  dashboard: "/dashboard",
  nutrition: "/nutrition",
  calendar: "/calendar",
  budget: "/budget",
  chat: "/chat",
  setup: {
    profile: "/setup/profile",
    notifications: "/setup/notifications",
    water: "/setup/water",
  },
} as const;

/** Endpoint API (route handler trong `src/app/api`). */
export const API_ROUTES = {
  auth: {
    session: "/api/auth/session",
    register: "/api/auth/register",
    changePassword: "/api/auth/change-password",
    forgotPassword: "/api/auth/forgot-password",
    resetPassword: "/api/auth/reset-password",
  },
  budget: {
    root: "/api/budget",
    accounts: "/api/budget/accounts",
    categories: "/api/budget/categories",
    goals: "/api/budget/goals",
    transactions: "/api/budget/transactions",
  },
  calendar: "/api/calendar",
  tasks: "/api/tasks",
  tags: "/api/tags",
  meals: {
    root: "/api/meals",
    estimate: "/api/meals/estimate",
    suggestPortions: "/api/meals/suggest-portions",
  },
  water: "/api/water",
  profile: "/api/profile",
  chat: "/api/chat",
  search: "/api/search",
  webPush: {
    subscription: "/api/web-push/subscription",
    test: "/api/web-push/test",
    sync: "/api/web-push/sync",
  },
} as const;

/** Static assets served from public/. */
export const ASSETS = {
  mascotIcon: "/chatbot-star.png",
} as const;

export type QueryValue = string | number | boolean | null | undefined;

/**
 * Append query parameters, encoding each value and skipping undefined and null.
 * `withQuery(API_ROUTES.tasks, { id, mode })` → `/api/tasks?id=..&mode=..`.
 */
export function withQuery(path: string, params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) search.append(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

/** Match a route or one of its descendants. For example, /chat matches /chat/abc but excludes /chatbot. */
export function isRouteActive(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}
