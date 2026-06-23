import { FEEDBACK_PROMPT } from "@/services/Constants";
import { NextResponse } from "next/server";
import { getOpenRouterClient } from "@/lib/ai/openrouter";
import { parseAiResponse } from "@/lib/ai/parse-ai-response";
import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client. Prefers the service-role key if present
// (recommended for server writes); otherwise falls back to the anon key,
// which already has insert/update rights on interview-feedback in this project.
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(req) {
    try {
        const {
            conversation,
            codeSubmission = "",
            codeLanguage = "",
            recordId = null,
        } = await req.json();

        let FINAL_PROMPT = FEEDBACK_PROMPT.replace("{{conversation}}", JSON.stringify(conversation));
        FINAL_PROMPT = FINAL_PROMPT.replace("{{code_submission}}", codeSubmission);
        FINAL_PROMPT = FINAL_PROMPT.replace("{{code_language}}", codeLanguage);

        const openai = getOpenRouterClient();

        const completion = await openai.chat.completions.create({
            model: "nvidia/nemotron-3-super-120b-a12b:free",
            messages: [
                { role: "user", content: FINAL_PROMPT }
            ],
        });

        const message = completion.choices[0].message;

        // If a recordId is supplied, parse + persist the feedback HERE on the
        // server. This makes grading bulletproof: it completes even if the
        // candidate's tab has already navigated away or been closed, because the
        // request handler runs to completion server-side once it's received.
        if (recordId) {
            try {
                const content = message?.content || "";
                const feedbackData = parseAiResponse(content);

                const { error: updateError } = await supabaseAdmin
                    .from("interview-feedback")
                    .update({ feedback: feedbackData })
                    .eq("id", recordId);

                if (updateError) throw updateError;
            } catch (persistErr) {
                console.error("Feedback persist failed:", persistErr);
                return NextResponse.json(
                    { ...message, persisted: false, error: persistErr.message },
                    { status: 200 }
                );
            }
        }

        return NextResponse.json({ ...message, persisted: !!recordId }, { status: 200 });
    }
    catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "Failed to generate feedback" }, { status: 500 })
    }
}
