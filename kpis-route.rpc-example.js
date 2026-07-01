// EXAMPLE — not wired into the live app. Reference for how
// app/api/analytics/kpis/route.js would change once
// supabase_get_analytics_kpis.sql has been applied and verified in Supabase.
//
// Do not swap this in until you've confirmed the RPC's output matches the
// current route's response for at least one real user (compare field by
// field: totalInterviews, totalCandidates, avgRating, topScore, hireRate,
// skillsPerformance, rolePerformance). If the RPC doesn't exist yet in the
// DB, calling supabase.rpc() below will error and break the whole page —
// that's why this isn't applied to the real route file yet.

import { NextResponse } from "next/server";
import { verifyUser } from "@/lib/auth/verify-user";

export async function GET(req) {
    try {
        const { email, supabase, error: authError } = await verifyUser(req);

        if (authError?.type === "missing_token") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (authError?.type === "invalid_token") {
            return NextResponse.json({ error: "Unauthorized or invalid session" }, { status: 401 });
        }

        // All the aggregation that used to happen in JS (the interviews query +
        // allFeedback.forEach reduce) now happens in Postgres in a single call.
        const { data, error } = await supabase.rpc("get_analytics_kpis", {
            p_user_email: email,
        });

        if (error) {
            console.error("get_analytics_kpis RPC error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // data is already shaped exactly like the current route's JSON response
        // (totalInterviews, totalCandidates, avgRating, topScore, hireRate,
        // recommendedCount, skillsPerformance, rolePerformance). recentInterview
        // and totalPositions parity should be double-checked against the SQL
        // function before cutting over — recentInterview isn't computed by the
        // draft RPC and would need to stay a light follow-up query or be added
        // to the function.
        return NextResponse.json(data);
    } catch (err) {
        console.error("Unexpected error in KPI route:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
