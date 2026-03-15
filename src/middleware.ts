import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/clients/:path*",
    "/cases/:path*",
    "/documents/:path*",
    "/diary/:path*",
    "/schedule/:path*",
    "/notices/:path*",
    "/chat/:path*",
    "/users/:path*",
    "/settings/:path*",
    "/audit/:path*",
    "/api/clients/:path*",
    "/api/cases/:path*",
    "/api/documents/:path*",
    "/api/diary/:path*",
    "/api/schedule/:path*",
    "/api/notices/:path*",
    "/api/chat/:path*",
    "/api/users/:path*",
    "/api/settings/:path*",
  ],
};
