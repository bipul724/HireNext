import { QUESTIONS_PROMPT } from "@/services/Constants";
import { NextResponse } from "next/server";
import { getOpenRouterClient } from "@/lib/ai/openrouter";
import { parseAiResponse } from "@/lib/ai/parse-ai-response";
import { aiRateLimit } from "@/lib/rate-limit";

export async function POST(req) {
    try {
        const body = await req.json();
        const { jobPosition, jobDescription, interviewDuration, interviewType } = body;

        // Backend validation for mutually exclusive Technical interview type
        if (Array.isArray(interviewType) && interviewType.includes("Technical") && interviewType.length > 1) {
            return NextResponse.json({ error: "Technical interviews cannot be combined with other interview types." }, { status: 400 });
        }

        const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
        const { success } = await aiRateLimit.limit(ip);
        if (!success) {
            return NextResponse.json({ error: "Too many requests" }, { status: 429 });
        }

        const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL;
        if (!OPENROUTER_MODEL) {
            throw new Error("OPENROUTER_MODEL environment variable is required.");
        }

        // Format the interview type(s) in a recruiter-friendly way:
        //   ["Behavioral"]                       -> "Behavioral"
        //   ["Behavioral", "Leadership"]         -> "Behavioral and Leadership"
        //   ["Experience","Problem Solving","X"] -> "Experience, Problem Solving and X"
        const formatInterviewType = (t) => {
            const arr = Array.isArray(t) ? t.filter(Boolean) : (t ? [t] : []);
            if (arr.length === 0) return "General";
            if (arr.length === 1) return String(arr[0]);
            return `${arr.slice(0, -1).join(", ")} and ${arr[arr.length - 1]}`;
        };

        // Replace ALL occurrences of every placeholder. Using split/join (rather
        // than String.replace, which only swaps the first match) so multi-use
        // placeholders like {{type}} / {{jobTitle}} are fully interpolated, and
        // so replacement values containing "$" are inserted literally.
        const replacements = {
            "{{jobTitle}}": jobPosition,
            "{{jobDescription}}": jobDescription,
            "{{duration}}": interviewDuration,
            "{{type}}": formatInterviewType(interviewType),
        };

        let FINAL_PROMPT = QUESTIONS_PROMPT;
        for (const [token, value] of Object.entries(replacements)) {
            FINAL_PROMPT = FINAL_PROMPT.split(token).join(value ?? "");
        }

        // Safety check: warn if any placeholder slipped through unreplaced.
        const leftover = FINAL_PROMPT.match(/\{\{\s*[\w.]+\s*\}\}/g);
        if (leftover) {
            console.warn("[ai-model] Unreplaced prompt placeholders:", leftover);
        }

        const openai = getOpenRouterClient();

        const completion = await openai.chat.completions.create({
            model: OPENROUTER_MODEL,
            messages: [
                { role: "user", content: FINAL_PROMPT }
            ],
        })

        const aiResponse = completion.choices[0].message.content;

        // --- CLEANING LOGIC START ---
        const parsedResponse = parseAiResponse(aiResponse, "AI did not generate valid JSON");
        // --- CLEANING LOGIC END ---

        return NextResponse.json(parsedResponse, { status: 200 })
    }
    catch (error) {
        console.error("=== API Error Details ===");
        console.error("Message:", error.message);
        console.error("Status:", error.status);
        console.error("Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        return NextResponse.json({ error: error.message || "Failed to generate questions" }, { status: 500 })
    }
}