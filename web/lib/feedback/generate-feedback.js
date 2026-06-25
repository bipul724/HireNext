import { FEEDBACK_PROMPT } from "@/services/Constants";
import { getOpenRouterClient } from "@/lib/ai/openrouter";
import { parseAiResponse } from "@/lib/ai/parse-ai-response";

// Single source of truth for AI interview feedback generation.
// Reused by BOTH the frontend-triggered route (/api/ai-feedback) and the Vapi
// webhook (/api/vapi/webhook) so there is exactly one prompt, model, parser, and
// output schema. Pure generation — persistence stays with each caller.
export const FEEDBACK_MODEL = process.env.OPENROUTER_MODEL;

export async function generateFeedback({ conversation, codeSubmission = "", codeLanguage = "" }) {
    if (!FEEDBACK_MODEL) {
        throw new Error("OPENROUTER_MODEL environment variable is required.");
    }

    let prompt = FEEDBACK_PROMPT.replace("{{conversation}}", JSON.stringify(conversation ?? ""));
    prompt = prompt.replace("{{code_submission}}", codeSubmission || "");
    prompt = prompt.replace("{{code_language}}", codeLanguage || "");

    const openai = getOpenRouterClient();
    const completion = await openai.chat.completions.create({
        model: FEEDBACK_MODEL,
        messages: [{ role: "user", content: prompt }],
    });

    const content = completion.choices?.[0]?.message?.content || "";
    const feedback = parseAiResponse(content); // throws if no valid JSON
    return { feedback, content };
}
