import { createClient } from "@supabase/supabase-js";
import fs from "fs";
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf-8').split('\n').filter(Boolean).map(line => line.split('=')));
const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
async function run() {
    const { data, error } = await supabase
        .from("interview-feedback")
        .select("*")
        .in("processing_status", ["pending", "processing"]);
    if (error) { console.error("Error:", error); } else { console.log("Rows:", data); }
}
run();
