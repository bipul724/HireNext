import { QUESTIONS_PROMPT } from "@/services/Constants";
import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req) {
    try {
        const body = await req.json();
        const { jobPosition, jobDescription, interviewDuration, interviewType } = body;

        // Backend validation for mutually exclusive Technical interview type
        if (Array.isArray(interviewType) && interviewType.includes("Technical") && interviewType.length > 1) {
            return NextResponse.json({ error: "Technical interviews cannot be combined with other interview types." }, { status: 400 });
        }

        console.log("--- AI Model API called ---");
        console.log("Received fields:", { jobPosition, jobDescription: jobDescription?.substring(0, 50), interviewDuration, interviewType });
        console.log("API Key present:", !!process.env.OPENROUTER_API_KEY);

        const FINAL_PROMPT = QUESTIONS_PROMPT
            .replace("{{jobTitle}}", jobPosition)
            .replace("{{jobDescription}}", jobDescription)
            .replace("{{duration}}", interviewDuration)
            .replace("{{type}}", interviewType)
            .replace("{{jobTitle}}", jobPosition);

        const openai = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: process.env.OPENROUTER_API_KEY,
        })

        const completion = await openai.chat.completions.create({
            model: "nvidia/nemotron-3-super-120b-a12b:free",
            messages: [
                { role: "user", content: FINAL_PROMPT }
            ],
        })

        const aiResponse = completion.choices[0].message.content;

        // --- CLEANING LOGIC START ---
        const start = aiResponse.indexOf('{');
        const end = aiResponse.lastIndexOf('}') + 1;

        if (start === -1 || end === -1) {
            throw new Error("AI did not generate valid JSON");
        }

        const jsonString = aiResponse.substring(start, end);
        const parsedResponse = JSON.parse(jsonString);
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