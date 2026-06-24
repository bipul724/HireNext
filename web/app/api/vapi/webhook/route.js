import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateFeedback } from "@/lib/feedback/generate-feedback";
import { timingSafeEqual } from "crypto";

// Server-side admin client (service-role preferred for unauthenticated webhook
// writes; falls back to anon, which already has insert/update rights here).
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Normalize the Vapi end-of-call-report into the conversation shape the feedback
// prompt expects. Resilient to missing/partial transcripts.
function extractConversation(msg) {
    const messages = msg?.artifact?.messages || msg?.messages || [];
    if (Array.isArray(messages) && messages.length) {
        return messages
            .filter((m) => m && m.role && m.role !== "system")
            .map((m) => ({ role: m.role, content: m.message ?? m.content ?? "" }))
            .filter((m) => String(m.content).trim().length > 0);
    }
    const t = msg?.artifact?.transcript || msg?.transcript || "";
    return t ? [{ role: "user", content: t }] : [];
}

// Best-effort code recovery for technical interviews. The ws-server persists
// code snapshots to Supabase (CodeSnapshots) on key events, so the latest one is
// readable here by interview_id without needing Redis access or a user token.
async function fetchLatestCode(interviewId) {
    try {
        const { data } = await supabaseAdmin
            .from("CodeSnapshots")
            .select("code,language,createdAt")
            .eq("interviewId", interviewId)
            .order("createdAt", { ascending: false })
            .limit(1);
        if (data && data[0]) return { code: data[0].code || "", language: data[0].language || "javascript" };
    } catch (_) { /* table optional / best-effort */ }
    return { code: "", language: "" };
}

export async function POST(req) {
    // Mandatory shared-secret verification. VAPI_WEBHOOK_SECRET must be set
    // whenever this route is deployed; the module-level guard below ensures it.
    const secret = process.env.VAPI_WEBHOOK_SECRET;
    if (!secret) {
        console.error("[vapi/webhook] VAPI_WEBHOOK_SECRET is not configured");
        return NextResponse.json({ ok: false, error: "server misconfigured" }, { status: 500 });
    }

    const header = req.headers.get("x-vapi-secret") || "";
    const expected = Buffer.from(secret);
    const received = Buffer.from(header);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    let body;
    try {
        body = await req.json();
    } catch (_) {
        return NextResponse.json({ ok: true }, { status: 200 });
    }

    try {
        const msg = body?.message || body || {};

        // end-of-call-report is the only event that carries the full transcript.
        if (msg.type !== "end-of-call-report") {
            return NextResponse.json({ ok: true, ignored: msg.type || "unknown" }, { status: 200 });
        }

        // Correlation comes from call metadata set by the frontend at vapi.start().
        const meta = msg.call?.metadata || msg.metadata || msg.assistantOverrides?.metadata || {};
        const interviewId = meta.interview_id || meta.interviewId;
        const userEmail = meta.userEmail || meta.candidateEmail;
        const userName = meta.userName || null;
        const interviewType = meta.type || "";
        const vapiCallId = msg.call?.id || null;

        if (!interviewId || !userEmail) {
            console.warn("[vapi/webhook] missing correlation metadata; acknowledging");
            return NextResponse.json({ ok: true, ignored: "no-metadata" }, { status: 200 });
        }

        // --- Check existing state ---
        const { data: existing } = await supabaseAdmin
            .from("interview-feedback")
            .select("id,feedback,processing_status,code_submission,code_language")
            .eq("interview_id", interviewId)
            .eq("userEmail", userEmail)
            .limit(1);
        const existingRow = existing?.[0];

        // Idempotency / State Machine Guard
        // Prevent completed/processing rows from regressing or double-generating.
        // Wait, if it's 'failed', we DO want to retry it. If it's 'pending', we DO want to process it.
        if (existingRow && (existingRow.processing_status === "completed" || existingRow.processing_status === "processing")) {
             return NextResponse.json({ ok: true, idempotent: true }, { status: 200 });
        }

        const conversation = extractConversation(msg);
        const transcript = msg.artifact?.transcript || msg.transcript || null;
        const processed_at = new Date().toISOString();

        // 1. Transcript-First Persistence (BEFORE AI Generation)
        // This guarantees that if Vercel times out during the 60s OpenRouter generation,
        // the transcript is safely preserved in the database and the state is 'failed' or 'processing'.
        let recordId = existingRow?.id;
        
        // Use existing frontend code if available, otherwise fetch from best-effort CodeSnapshots.
        let codeSubmission = existingRow?.code_submission || "";
        let codeLanguage = existingRow?.code_language || "";
        
        if (!existingRow) {
            if (/technical/i.test(interviewType)) {
                const c = await fetchLatestCode(interviewId);
                codeSubmission = c.code;
                codeLanguage = c.language;
            }
            
            // Row does not exist: INSERT (Safe, no overwrite of frontend data)
            const { data: inserted } = await supabaseAdmin
                .from("interview-feedback")
                .insert({
                    interview_id: interviewId,
                    userEmail,
                    userName,
                    code_submission: codeSubmission,
                    code_language: codeLanguage,
                    recommended: false,
                    transcript,
                    vapi_call_id: vapiCallId,
                    processed_at,
                    processing_status: conversation.length ? "processing" : "failed",
                })
                .select("id");
            recordId = inserted?.[0]?.id;
        } else {
            // Row exists: TARGETED UPDATE (Strictly prohibits overwriting code_submission/user data)
            await supabaseAdmin
                .from("interview-feedback")
                .update({
                    transcript,
                    vapi_call_id: vapiCallId,
                    processed_at,
                    processing_status: conversation.length ? "processing" : "failed"
                })
                .eq("id", recordId);
        }

        // No usable transcript → stop after preserving what we have.
        if (!conversation.length) {
            return NextResponse.json({ ok: true, status: "no-transcript" }, { status: 200 });
        }

        // 2. Generate AI Feedback
        try {
            const { feedback } = await generateFeedback({ conversation, codeSubmission, codeLanguage });
            
            // 3. Final Persistence (Success)
            if (recordId) {
                await supabaseAdmin
                    .from("interview-feedback")
                    .update({ feedback, processing_status: "completed" })
                    .eq("id", recordId);
            }
            return NextResponse.json({ ok: true, status: "completed" }, { status: 200 });
        } catch (genErr) {
            console.error("[vapi/webhook] feedback generation failed:", genErr?.message || genErr);
            // 4. Failure Persistence (Fallback)
            if (recordId) {
                await supabaseAdmin
                    .from("interview-feedback")
                    .update({ processing_status: "failed" })
                    .eq("id", recordId);
            }
            return NextResponse.json({ ok: true, status: "failed" }, { status: 200 });
        }
    } catch (err) {
        // Always ack 200 so Vapi doesn't retry-storm; data is preserved/retryable.
        console.error("[vapi/webhook] error:", err?.message || err);
        return NextResponse.json({ ok: true }, { status: 200 });
    }
}
