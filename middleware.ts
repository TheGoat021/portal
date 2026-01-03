import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = request.nextUrl.pathname;

  // 🔒 Protege o portal
  if (pathname.startsWith("/portal") && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 🔁 Evita voltar pro login logado
  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/portal", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/portal/:path*", "/login"],
};
