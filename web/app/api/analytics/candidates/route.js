import { NextResponse } from "next/server";
import { verifyUser } from "@/lib/auth/verify-user";

export async function GET(req) {
    try {
        const { user, email, supabase, error: authError } = await verifyUser(req);
        if (authError?.type === "missing_token") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (authError?.type === "invalid_token") return NextResponse.json({ error: "Unauthorized or invalid session" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "5", 10);
    const cursorDate = searchParams.get("cursor_date");
    const cursorId = searchParams.get("cursor_id");

    let query = supabase
        .from("interview-feedback")
        .select("*, interview:Interviews!inner(jobPosition, type, userEmail)")
        .eq("interview.userEmail", email)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit + 1);

    if (cursorDate && cursorId) {
        query = query.or(`created_at.lt.${cursorDate},and(created_at.eq.${cursorDate},id.lt.${cursorId})`);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Supabase query error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;

    let nextCursor = null;
    if (hasMore) {
        const lastItem = items[items.length - 1];
        nextCursor = {
            cursor_date: lastItem.created_at,
            cursor_id: lastItem.id
        };
    }

        return NextResponse.json({
            items,
            nextCursor,
            hasMore
        });
    } catch (err) {
        console.error("Unexpected error in candidate analytics route:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
