import { NextRequest, NextResponse } from "next/server";
import { verifySessionTokenEdge, getSessionSecret } from "@/lib/auth/token";

function resolveSessionSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.AUTH_SECRET ||
    getSessionSecret()
  );
}

function resolveFixtureSession(req: NextRequest) {
  if (process.env.NODE_ENV === "production") return null;

  const appRole = req.cookies.get("APP_ROLE")?.value;
  const studentId = req.cookies.get("DEMO_STUDENT_ID")?.value;
  const authSession = req.cookies.get("auth_session")?.value;

  if (appRole && authSession) {
    const isQuarantined =
      studentId === "sp_newstudent_001" ||
      Boolean(studentId?.includes("newstudent"));

    return {
      userId: studentId ? `usr_${studentId}` : "usr_fixture_admin",
      role: appRole as "ADMIN" | "TEACHER" | "CR" | "STUDENT",
      mustChangePassword: Boolean(isQuarantined),
      expiresAt: Date.now() + 3600000,
    };
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. Bypass public static assets and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/uploadthing") ||
    pathname === "/favicon.ico" ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf)$/)
  ) {
    return NextResponse.next();
  }

  // 2. Read and verify session token
  const rawToken = request.cookies.get("auth_session")?.value;
  let session = rawToken
    ? await verifySessionTokenEdge(rawToken, resolveSessionSecret())
    : null;

  // Test fixture fallback (non-production only)
  if (!session && process.env.NODE_ENV !== "production") {
    session = resolveFixtureSession(request);
  }

  const isAuthenticated = Boolean(session);
  const isQuarantined = Boolean(session?.mustChangePassword);
  const isLoginPage = pathname === "/login";
  const isChangePasswordPage = pathname === "/change-password";
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  // 3. Handle unauthenticated requests
  if (!isAuthenticated) {
    if (isLoginPage) {
      return NextResponse.next();
    }
    const callbackUrl = encodeURIComponent(`${pathname}${search}`);
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${callbackUrl}`, request.url)
    );
  }

  // 4. Handle authenticated quarantined users (mustChangePassword === true)
  if (isQuarantined) {
    if (isChangePasswordPage) {
      return NextResponse.next();
    }
    // Quarantine redirect: block all protected views and send to /change-password
    return NextResponse.redirect(new URL("/change-password", request.url));
  }

  // 5. Handle authenticated normal users on auth routes
  if (isChangePasswordPage && !isQuarantined) {
    // Already changed password -> exit quarantine to appropriate dashboard
    const destination = session?.role === "ADMIN" ? "/admin/accounts" : "/";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (isLoginPage) {
    const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
    if (
      callbackUrl &&
      callbackUrl.startsWith("/") &&
      !callbackUrl.startsWith("//") &&
      !callbackUrl.startsWith("/login")
    ) {
      return NextResponse.redirect(new URL(callbackUrl, request.url));
    }
    const destination = session?.role === "ADMIN" ? "/admin/accounts" : "/";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // 6. Enforce RBAC for Admin routes
  if (isAdminRoute) {
    if (session?.role !== "ADMIN") {
      // Deny access to non-admin roles: redirect safely to student dashboard
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const middleware = proxy;
export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf)$).*)",
  ],
};
