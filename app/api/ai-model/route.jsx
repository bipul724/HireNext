import { QUESTIONS_PROMPT } from "@/services/Constants";
import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req) {
    try {
        const { jobPosition, jobDescription, duration, type } = await req.json();

        const FINAL_PROMPT = QUESTIONS_PROMPT
            .replace("{{jobTitle}}", jobPosition)
            .replace("{{jobDescription}}", jobDescription)
            .replace("{{duration}}", duration)
            .replace("{{type}}", type)
            .replace("{{jobTitle}}", jobPosition);

        const openai = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: process.env.OPENROUTER_API_KEY,
        })

        const completion = await openai.chat.completions.create({
            model: "meta-llama/llama-3.3-70b-instruct:free",
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
        console.error("API Error:", error);
        return NextResponse.json({ error: "Failed to generate questions" }, { status: 500 })
    }
}