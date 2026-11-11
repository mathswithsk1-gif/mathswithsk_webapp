import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "src/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * Keeps the free-tier Supabase project from pausing by running a tiny query.
 * Vercel Cron calls this with `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from("courses")
      .select("id", { count: "exact", head: true });

    if (error) throw error;

    return NextResponse.json({ ok: true, courses: count ?? 0, timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.error("Supabase keep-alive failed:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Supabase ping failed", timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
