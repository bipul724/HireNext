import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateFeedback } from "@/lib/feedback/generate-feedback";

// Server-side Supabase client. Prefers the service-role key if present
// (recommended for server writes); otherwise falls back to the anon key,
// which already has insert/update rights on interview-feedback in this project.
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(req) {
    let recordId = null;
    try {
        const {
            conversation,
            codeSubmission = "",
            codeLanguage = "",
            recordId: rid = null,
        } = await req.json();
        recordId = rid;

        // 1. Transition to 'processing' state before invoking the AI pipeline.
        // This acts as a lock to prevent concurrent webhook retries while generation is ongoing.
        if (recordId) {
            try {
                await supabaseAdmin
                    .from("interview-feedback")
                    .update({ processing_status: "processing" })
                    .eq("id", recordId);
            } catch (_) { /* Best effort lock */ }
        }

        // Reuse the shared feedback pipeline (same prompt / model / parser / schema).
        const { feedback } = await generateFeedback({ conversation, codeSubmission, codeLanguage });

        // If a recordId is supplied, persist the feedback HERE on the server so
        // grading completes even if the candidate's tab has navigated away/closed.
        if (recordId) {
            try {
                const { error: updateError } = await supabaseAdmin
                    .from("interview-feedback")
                    .update({ feedback, processing_status: "completed" })
                    .eq("id", recordId);

                if (updateError) throw updateError;
            } catch (persistErr) {
                console.error("Feedback persist failed:", persistErr);
                // Mark as failed so the webhook can retry later.
                await supabaseAdmin
                    .from("interview-feedback")
                    .update({ processing_status: "failed" })
                    .eq("id", recordId);
                return NextResponse.json({ persisted: false, error: persistErr.message }, { status: 200 });
            }
        }

        return NextResponse.json({ persisted: !!recordId, feedback }, { status: 200 });
    }
    catch (error) {
        console.error("API Error:", error);
        // Mark as failed so the webhook recovery path can pick it up.
        if (recordId) {
            try {
                await supabaseAdmin
                    .from("interview-feedback")
                    .update({ processing_status: "failed" })
                    .eq("id", recordId);
            } catch (_) { /* best-effort */ }
        }
        return NextResponse.json({ error: "Failed to generate feedback" }, { status: 500 });
    }
}
