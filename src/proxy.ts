import { withAuth } from "next-auth/middleware";
import { ROUTES } from "@/shared/config/routes";

/** In Next.js 16, proxy replaces middleware and redirects unauthenticated visitors from protected pages to sign-in. */
export default withAuth({
  pages: {
    signIn: ROUTES.login,
  },
});

// Next.js statically analyzes config at build time, so matcher requires a literal rather than a ROUTES reference.
// When adding a protected page, update both this matcher and ROUTES in src/shared/config/routes.ts.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/diary/:path*",
    "/budget/:path*",
    "/calendar/:path*",
    "/nutrition/:path*",
    "/chat/:path*",
    "/settings/:path*",
    "/setup/:path*",
  ],
};
