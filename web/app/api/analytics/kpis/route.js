import { NextResponse } from "next/server";
import { verifyUser } from "@/lib/auth/verify-user";

export async function GET(req) {
    try {
        const { user, email, supabase, error: authError } = await verifyUser(req);
        
        if (authError?.type === "missing_token") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (authError?.type === "invalid_token") {
            return NextResponse.json({ error: "Unauthorized or invalid session" }, { status: 401 });
        }

        const { data, error } = await supabase.rpc('get_analytics_kpis', {
            p_email: email
        });

        if (error) {
            console.error("Supabase RPC error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (err) {
        console.error("Unexpected error in KPI route:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
