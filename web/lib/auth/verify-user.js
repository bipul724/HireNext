import { createClient } from "@supabase/supabase-js";

export async function verifyUser(req) {
    const authHeader = req.headers.get("authorization") || "";
    // Normalize Bearer token extraction
    let token = null;
    if (authHeader.startsWith("Bearer ")) {
        token = authHeader.slice(7);
    } else if (authHeader.includes("Bearer ")) {
        token = authHeader.replace("Bearer ", "");
    }

    if (!token) {
        return { error: { type: "missing_token" } };
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { 
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false }
        }
    );

    const { data: authData, error: authErr } = await supabase.auth.getUser(token);
    const user = authData?.user;

    if (authErr || !user || !user.email) {
        return { error: { type: "invalid_token" } };
    }

    return { user, email: user.email, supabase, error: null };
}
