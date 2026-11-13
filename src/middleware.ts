import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/budget/:path*",
    "/calendar/:path*",
    "/nutrition/:path*",
    "/tasks/:path*",
    "/water/:path*",
    "/chat/:path*",
    "/setup/:path*",
  ],
};
