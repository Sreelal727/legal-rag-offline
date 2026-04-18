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
    "/banking-matter/:path*",
    "/banking-matter",
    "/execution/:path*",
    "/statement-of-accounts/:path*",
    "/revival-letters/:path*",
    "/interlocutory/:path*",
    "/case-filing/:path*",
    "/submissions/:path*",
    "/ecourts/:path*",
    "/scrutiny/:path*",
    "/limitation/:path*",
    "/billing/:path*",
    "/bank-opinion/:path*",
    "/format-library/:path*",
    "/templates/:path*",
    "/defence/:path*",
    "/api/clients/:path*",
    "/api/cases/:path*",
    "/api/documents/:path*",
    "/api/diary/:path*",
    "/api/schedule/:path*",
    "/api/notices/:path*",
    "/api/chat/:path*",
    "/api/users/:path*",
    "/api/settings/:path*",
    // NOTE: /api/banking-matter/* routes are NOT listed here.
    // They all use withAuth() internally, and keeping them out of the
    // middleware avoids the 10MB body limit on large document uploads.
    "/api/account-statements/:path*",
    "/api/revival-letters/:path*",
    "/api/execution/:path*",
  ],
};
