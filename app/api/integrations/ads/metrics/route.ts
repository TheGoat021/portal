import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const platform = searchParams.get("platform"); // google | meta
    const start = searchParams.get("start"); // YYYY-MM-DD
    const end = searchParams.get("end"); // YYYY-MM-DD

    let query = supabaseAdmin
      .from("ads_campaign_metrics")
      .select("*")
      .order("date", { ascending: false });

    if (platform) {
      query = query.eq("platform", platform);
    }

    if (start) {
      query = query.gte("date", start);
    }

    if (end) {
      query = query.lte("date", end);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[ADS METRICS GET ERROR]", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
