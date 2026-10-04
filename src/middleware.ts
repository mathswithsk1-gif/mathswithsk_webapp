import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// We import Ratelimit conditionally if Upstash is available
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const hasRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

// Configure rate limiters if keys are present
const limiters = hasRedis
  ? {
      auth: new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(5, "60 s"),
        analytics: true,
        prefix: "ratelimit:auth",
      }),
      checkout: new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(5, "60 s"),
        analytics: true,
        prefix: "ratelimit:checkout",
      }),
      progress: new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(60, "60 s"),
        analytics: true,
        prefix: "ratelimit:progress",
      }),
      sign: new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(60, "60 s"),
        analytics: true,
        prefix: "ratelimit:sign",
      }),
    }
  : null;

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const pathname = request.nextUrl.pathname;

  // 1. SUPABASE SESSION COOKIE REFRESH
  // Required to keep user session authenticated inside Server Components
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // This updates the session cookie if expired
    await supabase.auth.getUser();
  }

  // 2. UPSTASH RATE LIMITER (Serverless Edge Safe)
  if (limiters) {
    const ip = (request as any).ip || request.headers.get("x-forwarded-for") || "127.0.0.1";
    let limiterType: keyof typeof limiters | null = null;

    if (pathname.startsWith("/api/progress")) {
      limiterType = "progress";
    } else if (pathname.startsWith("/api/video/sign")) {
      limiterType = "sign";
    } else if (pathname.startsWith("/checkout") && request.method === "POST") {
      limiterType = "checkout";
    } else if (pathname.startsWith("/auth") && request.method === "POST") {
      limiterType = "auth";
    }

    if (limiterType) {
      try {
        const limiter = limiters[limiterType];
        const { success, limit, reset, remaining } = await limiter.limit(ip);
        
        if (!success) {
          return new NextResponse("Rate Limit Exceeded. Please slow down.", {
            status: 429,
            headers: {
              "X-RateLimit-Limit": limit.toString(),
              "X-RateLimit-Remaining": remaining.toString(),
              "X-RateLimit-Reset": reset.toString(),
            },
          });
        }
      } catch (err) {
        console.error("Rate limiting middleware check error:", err);
        // Fail-safe: allow requests if Upstash fails temporarily
      }
    }
  }

  return response;
}

// Config to specify matching route paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
