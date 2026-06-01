import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/signup", "/auth"];

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Refreshes the Supabase session on every request and enforces:
 *   - unauthenticated users are sent to /login
 *   - authenticated users are kept out of /login and /signup
 *   - employees cannot reach /dashboard/admin (sent to their own dashboard)
 *   - "/" and "/dashboard" dispatch to the correct role dashboard
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Not signed in → only public routes are allowed.
  if (!user) {
    if (isPublic(pathname)) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  // Signed in → resolve the role once for routing decisions.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role === "admin" ? "admin" : "employee";
  const homeForRole = role === "admin" ? "/dashboard/admin" : "/dashboard/employee";

  // Keep signed-in users away from auth screens and dispatch the entry points.
  if (isPublic(pathname) || pathname === "/" || pathname === "/dashboard") {
    const url = request.nextUrl.clone();
    url.pathname = homeForRole;
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Employees may never enter the admin area.
  if (pathname.startsWith("/dashboard/admin") && role !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard/employee";
    return NextResponse.redirect(url);
  }

  return response;
}
