import { FEEDBACK_PROMPT } from "@/services/Constants";
import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req) {
    const {conversation} = await req.json();
    const FINAL_PROMPT = FEEDBACK_PROMPT.replace("{{conversation}}",JSON.stringify(conversation));
    try {
           
    
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
    
           
    
            return NextResponse.json(completion.choices[0].message, { status: 200 })
        }
        catch (error) {
            console.error("API Error:", error);
            return NextResponse.json({ error: "Failed to generate questions" }, { status: 500 })
        }
}